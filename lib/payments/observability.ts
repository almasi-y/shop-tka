type PaymentLogLevel = "info" | "warn" | "error";

type PaymentLogFields = Record<
  string,
  boolean | number | string | null | undefined
>;

function getErrorMetadata(error: unknown): PaymentLogFields {
  if (!(error instanceof Error)) {
    return { errorName: "UnknownError" };
  }

  const candidate = error as Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };

  return {
    errorName: candidate.name,
    errorCode:
      typeof candidate.code === "string" ? candidate.code : undefined,
    statusCode:
      typeof candidate.statusCode === "number"
        ? candidate.statusCode
        : typeof candidate.status === "number"
          ? candidate.status
          : undefined,
  };
}

export function logPaymentEvent(
  level: PaymentLogLevel,
  event: string,
  fields: PaymentLogFields = {},
  error?: unknown,
) {
  const payload = JSON.stringify({
    scope: "payments",
    event,
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    ...fields,
    ...(error === undefined ? {} : getErrorMetadata(error)),
  });

  console[level](payload);
}

export async function reportPaymentFailure(
  event: string,
  fields: PaymentLogFields = {},
  error?: unknown,
) {
  logPaymentEvent("error", event, fields, error);

  const alertUrl = process.env.PAYMENT_ALERT_WEBHOOK_URL;
  if (!alertUrl) return;

  try {
    const parsedUrl = new URL(alertUrl);
    if (
      parsedUrl.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && parsedUrl.protocol === "http:")
    ) {
      logPaymentEvent("error", "payment.alert.invalid_url");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(parsedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Payment operations alert: ${event}`,
          content: `Payment operations alert: ${event}`,
          event,
          timestamp: new Date().toISOString(),
          deployment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
          ...fields,
          ...(error === undefined ? {} : getErrorMetadata(error)),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        logPaymentEvent("error", "payment.alert.delivery_failed", {
          alertStatus: response.status,
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (alertError) {
    logPaymentEvent(
      "error",
      "payment.alert.delivery_failed",
      {},
      alertError,
    );
  }
}
