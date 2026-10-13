import { serverReadClient } from "@/sanity/lib/server-client";
import { isVercelCron } from "@/lib/payments/operations-auth";
import {
  logPaymentEvent,
  reportPaymentFailure,
} from "@/lib/payments/observability";
import { listSuccessfulPaystackTransactions } from "@/lib/payments/paystack";
import { reconcilePaystackReference } from "@/lib/payments/reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const LOOKBACK_DAYS = 7;
const PER_PAGE = 100;
const MAX_PAGES = 5;

export async function GET(request: Request) {
  if (!isVercelCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = new Date();
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1_000);

  try {
    const candidates = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await listSuccessfulPaystackTransactions({
        from: from.toISOString(),
        to: to.toISOString(),
        page,
        perPage: PER_PAGE,
      });
      candidates.push(
        ...result.transactions.filter(
          (transaction) =>
            transaction.status === "success" &&
            transaction.currency?.toUpperCase() === "KES" &&
            transaction.reference?.startsWith("order-") &&
            Boolean(transaction.metadata?.clerkUserId),
        ),
      );
      if (page >= result.pageCount || result.transactions.length < PER_PAGE) {
        break;
      }
    }

    const references = [
      ...new Set(
        candidates.flatMap((transaction) =>
          transaction.reference ? [transaction.reference] : [],
        ),
      ),
    ];
    const existingReferences = references.length
      ? await serverReadClient.fetch<string[]>(
          `*[_type == "order" && paystackReference in $references].paystackReference`,
          { references },
        )
      : [];
    const existing = new Set(existingReferences);
    const missing = references.filter((reference) => !existing.has(reference));

    let recovered = 0;
    let failed = 0;
    for (const reference of missing) {
      try {
        const result = await reconcilePaystackReference(reference);
        if (!result.duplicate) recovered += 1;
        logPaymentEvent("info", "payment.cron_reconciliation.succeeded", {
          reference,
          duplicate: result.duplicate,
        });
      } catch (error) {
        failed += 1;
        await reportPaymentFailure(
          "payment.cron_reconciliation.failed",
          { reference },
          error,
        );
      }
    }

    const summary = {
      scanned: references.length,
      missing: missing.length,
      recovered,
      failed,
    };
    logPaymentEvent(
      failed > 0 ? "warn" : "info",
      "payment.cron_reconciliation.completed",
      summary,
    );
    return Response.json(summary, { status: failed > 0 ? 500 : 200 });
  } catch (error) {
    await reportPaymentFailure(
      "payment.cron_reconciliation.unexpected_error",
      {},
      error,
    );
    return Response.json(
      { error: "Scheduled reconciliation failed" },
      { status: 500 },
    );
  }
}
