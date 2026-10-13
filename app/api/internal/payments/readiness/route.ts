import { checkPaymentReadiness } from "@/lib/payments/readiness";
import { isPaymentOperator } from "@/lib/payments/operations-auth";
import { reportPaymentFailure } from "@/lib/payments/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isPaymentOperator(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkPaymentReadiness();
    if (!result.ok) {
      await reportPaymentFailure("payment.readiness.failed", {
        failedChecks: result.checks.filter(
          (check) => check.required && !check.ok,
        ).length,
      });
    }
    return Response.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    await reportPaymentFailure(
      "payment.readiness.unexpected_error",
      {},
      error,
    );
    return Response.json(
      { ok: false, error: "Payment readiness check failed" },
      { status: 503 },
    );
  }
}
