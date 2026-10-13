import { auth } from "@clerk/nextjs/server";
import { serverReadClient } from "@/sanity/lib/server-client";
import { ORDER_STATUS_BY_PAYSTACK_REFERENCE_QUERY } from "@/lib/sanity/queries/orders";
import {
  fulfillPaystackTransaction,
  PaystackFulfillmentError,
  type PaystackTransaction,
} from "@/lib/checkout/fulfill-paystack-transaction";

const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify";

type PaystackVerifyResponse = {
  status?: boolean;
  message?: string;
  data?: PaystackTransaction;
};

function getReference(request: Request) {
  return new URL(request.url).searchParams.get("reference")?.trim();
}

async function findOrder(reference: string) {
  return serverReadClient.fetch(ORDER_STATUS_BY_PAYSTACK_REFERENCE_QUERY, {
    paystackReference: reference,
  });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const reference = getReference(request);
  if (!reference || reference.length > 160) {
    return Response.json({ error: "Invalid payment reference" }, { status: 400 });
  }

  const order = await findOrder(reference);

  if (!order) {
    return Response.json({ confirmed: false });
  }
  if (order.clerkUserId !== userId) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  return Response.json({
    confirmed: true,
    orderId: order._id,
    status: order.status,
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const reference = getReference(request);
  if (!reference || reference.length > 160) {
    return Response.json({ error: "Invalid payment reference" }, { status: 400 });
  }

  const existingOrder = await findOrder(reference);
  if (existingOrder) {
    if (existingOrder.clerkUserId !== userId) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    return Response.json({
      confirmed: true,
      orderId: existingOrder._id,
      status: existingOrder.status,
    });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return Response.json(
      { error: "Paystack is not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      },
    );
    const verification = (await response.json()) as PaystackVerifyResponse;

    if (
      !response.ok ||
      !verification.status ||
      !verification.data ||
      verification.data.reference !== reference
    ) {
      console.error("Paystack reconciliation verification failed", {
        reference,
        status: response.status,
        message: verification.message,
      });
      return Response.json({ confirmed: false });
    }

    if (verification.data.status !== "success") {
      return Response.json({ confirmed: false });
    }

    const result = await fulfillPaystackTransaction(
      verification.data,
      userId,
    );
    return Response.json({
      confirmed: true,
      orderId: result.orderId,
      status: "paid",
      reconciled: true,
    });
  } catch (error) {
    const status =
      error instanceof PaystackFulfillmentError ? error.status : 502;
    const message =
      error instanceof PaystackFulfillmentError
        ? error.message
        : "Unable to verify payment";
    console.error("Paystack reconciliation failed", { reference, error });
    return Response.json({ error: message }, { status });
  }
}
