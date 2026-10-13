import { auth } from "@clerk/nextjs/server";
import { serverReadClient } from "@/sanity/lib/server-client";
import { ORDER_STATUS_BY_PAYSTACK_REFERENCE_QUERY } from "@/lib/sanity/queries/orders";
import {
  PaymentReconciliationError,
  reconcilePaystackReference,
} from "@/lib/payments/reconcile";
import {
  logPaymentEvent,
  reportPaymentFailure,
} from "@/lib/payments/observability";

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

  try {
    const result = await reconcilePaystackReference(reference, userId);
    logPaymentEvent("info", "payment.callback_reconciliation.succeeded", {
      reference,
      duplicate: result.duplicate,
    });
    return Response.json({
      confirmed: true,
      orderId: result.orderId,
      status: "paid",
      reconciled: true,
    });
  } catch (error) {
    const reconciliationError =
      error instanceof PaymentReconciliationError ? error : null;
    if (
      reconciliationError?.code === "PAYSTACK_TRANSACTION_NOT_SUCCESSFUL"
    ) {
      return Response.json({ confirmed: false });
    }
    await reportPaymentFailure(
      "payment.callback_reconciliation.failed",
      {
        reference,
        failureCode:
          reconciliationError?.code ?? "PAYMENT_RECONCILIATION_FAILED",
      },
      error,
    );
    return Response.json(
      {
        error: reconciliationError?.message ?? "Unable to verify payment",
        code:
          reconciliationError?.code ?? "PAYMENT_RECONCILIATION_FAILED",
      },
      { status: reconciliationError?.status ?? 502 },
    );
  }
}
