import crypto from "node:crypto";
import {
  fulfillPaystackTransaction,
  PaystackFulfillmentError,
  type PaystackTransaction,
} from "@/lib/checkout/fulfill-paystack-transaction";
import {
  logPaymentEvent,
  reportPaymentFailure,
} from "@/lib/payments/observability";

type PaystackEvent = {
  event?: string;
  data?: PaystackTransaction;
};

function signaturesMatch(body: string, signature: string, secret: string) {
  if (!/^[a-f\d]{128}$/i.test(signature)) return false;

  const expected = crypto.createHmac("sha512", secret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    await reportPaymentFailure("payment.webhook.configuration_failed", {
      failureCode: "PAYSTACK_SECRET_MISSING",
    });
    return Response.json({ error: "Paystack is not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!signature || !signaturesMatch(body, signature, secret)) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(body) as PaystackEvent;
  } catch {
    return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  if (event.event !== "charge.success" || !event.data) {
    return Response.json({ received: true });
  }

  try {
    const result = await fulfillPaystackTransaction(event.data);
    logPaymentEvent("info", "payment.webhook_fulfillment.succeeded", {
      reference: event.data.reference,
      duplicate: result.duplicate,
    });
    return Response.json({ received: true, ...result });
  } catch (error) {
    const status =
      error instanceof PaystackFulfillmentError ? error.status : 500;
    const message =
      error instanceof PaystackFulfillmentError
        ? error.message
        : "Unable to record paid order";
    await reportPaymentFailure(
      "payment.webhook_fulfillment.failed",
      {
        reference: event.data.reference,
        failureCode:
          error instanceof PaystackFulfillmentError
            ? error.code
            : "PAYSTACK_FULFILLMENT_FAILED",
      },
      error,
    );
    return Response.json(
      {
        error: message,
        code:
          error instanceof PaystackFulfillmentError
            ? error.code
            : "PAYSTACK_FULFILLMENT_FAILED",
      },
      { status },
    );
  }
}
