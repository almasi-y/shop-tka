import crypto from "node:crypto";
import { client, writeClient } from "@/sanity/lib/client";
import { listSuccessfulPaystackTransactions } from "@/lib/payments/paystack";

export type PaymentReadinessCheck = {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
};

export class PaymentReadinessError extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PaymentReadinessError";
  }
}

export async function assertSanityOrderWritesReady() {
  if (!process.env.SANITY_API_WRITE_TOKEN) {
    throw new PaymentReadinessError(
      "Order storage is not configured",
      "SANITY_WRITE_TOKEN_MISSING",
    );
  }

  try {
    await writeClient.create(
      {
        _id: `payment-readiness-${crypto.randomUUID()}`,
        _type: "paymentReadinessProbe",
        checkedAt: new Date().toISOString(),
      },
      { dryRun: true },
    );
  } catch (error) {
    throw new PaymentReadinessError(
      "Order storage is unavailable",
      "SANITY_WRITE_DRY_RUN_FAILED",
      { cause: error },
    );
  }
}

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function checkPaymentReadiness() {
  const checks: PaymentReadinessCheck[] = [
    {
      name: "paystack-secret",
      ok: configured("PAYSTACK_SECRET_KEY"),
      detail: configured("PAYSTACK_SECRET_KEY") ? "configured" : "missing",
      required: true,
    },
    {
      name: "sanity-read-token",
      ok: configured("SANITY_API_READ_TOKEN"),
      detail: configured("SANITY_API_READ_TOKEN") ? "configured" : "missing",
      required: true,
    },
    {
      name: "sanity-write-token",
      ok: configured("SANITY_API_WRITE_TOKEN"),
      detail: configured("SANITY_API_WRITE_TOKEN") ? "configured" : "missing",
      required: true,
    },
    {
      name: "cron-secret",
      ok: configured("CRON_SECRET"),
      detail: configured("CRON_SECRET") ? "configured" : "missing",
      required: true,
    },
    {
      name: "operations-secret",
      ok: configured("PAYMENT_OPERATIONS_SECRET"),
      detail: configured("PAYMENT_OPERATIONS_SECRET")
        ? "configured"
        : "missing",
      required: true,
    },
    {
      name: "alert-webhook",
      ok: configured("PAYMENT_ALERT_WEBHOOK_URL"),
      detail: configured("PAYMENT_ALERT_WEBHOOK_URL")
        ? "configured"
        : "not configured",
      required: false,
    },
  ];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const productionUrlOk =
    process.env.VERCEL_ENV !== "production" ||
    (Boolean(baseUrl) &&
      baseUrl?.startsWith("https://") &&
      !baseUrl.includes("localhost") &&
      !baseUrl.includes("ngrok"));
  checks.push({
    name: "production-base-url",
    ok: Boolean(productionUrlOk),
    detail: productionUrlOk ? "valid for this environment" : "invalid",
    required: true,
  });

  try {
    await client
      .withConfig({
        token: process.env.SANITY_API_READ_TOKEN,
        useCdn: false,
      })
      .fetch(`count(*[_type == "order"])`);
    checks.push({
      name: "sanity-read",
      ok: true,
      detail: "connected",
      required: true,
    });
  } catch {
    checks.push({
      name: "sanity-read",
      ok: false,
      detail: "connection or permission failed",
      required: true,
    });
  }

  try {
    await assertSanityOrderWritesReady();
    checks.push({
      name: "sanity-write-dry-run",
      ok: true,
      detail: "authorized",
      required: true,
    });
  } catch {
    checks.push({
      name: "sanity-write-dry-run",
      ok: false,
      detail: "connection or permission failed",
      required: true,
    });
  }

  try {
    const now = new Date();
    await listSuccessfulPaystackTransactions({
      from: new Date(now.getTime() - 60_000).toISOString(),
      to: now.toISOString(),
      page: 1,
      perPage: 1,
    });
    checks.push({
      name: "paystack-api",
      ok: true,
      detail: process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")
        ? "connected in live mode"
        : "connected in test mode",
      required: true,
    });
  } catch {
    checks.push({
      name: "paystack-api",
      ok: false,
      detail: "connection or authentication failed",
      required: true,
    });
  }

  return {
    ok: checks.every((check) => !check.required || check.ok),
    checkedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    checks,
  };
}
