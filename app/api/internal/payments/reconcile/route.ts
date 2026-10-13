import { z } from "zod";
import { isPaymentOperator } from "@/lib/payments/operations-auth";
import { reportPaymentFailure, logPaymentEvent } from "@/lib/payments/observability";
import {
  PaymentReconciliationError,
  reconcilePaystackReference,
} from "@/lib/payments/reconcile";

export const runtime = "nodejs";

const requestSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(7)
    .max(160)
    .regex(/^order-[A-Za-z0-9.=-]+$/),
});

export async function POST(request: Request) {
  if (!isPaymentOperator(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "A valid order reference is required" },
      { status: 400 },
    );
  }

  const { reference } = parsed.data;
  try {
    const result = await reconcilePaystackReference(reference);
    logPaymentEvent("info", "payment.manual_reconciliation.succeeded", {
      reference,
      duplicate: result.duplicate,
    });
    return Response.json({
      reconciled: true,
      orderId: result.orderId,
      duplicate: result.duplicate,
    });
  } catch (error) {
    const reconciliationError =
      error instanceof PaymentReconciliationError ? error : null;
    await reportPaymentFailure(
      "payment.manual_reconciliation.failed",
      {
        reference,
        failureCode:
          reconciliationError?.code ?? "PAYMENT_RECONCILIATION_FAILED",
      },
      error,
    );
    return Response.json(
      {
        error: reconciliationError?.message ?? "Unable to reconcile payment",
        code:
          reconciliationError?.code ?? "PAYMENT_RECONCILIATION_FAILED",
      },
      { status: reconciliationError?.status ?? 502 },
    );
  }
}
