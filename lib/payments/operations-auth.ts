import crypto from "node:crypto";

function safeMatch(actual: string | null, expected: string | undefined) {
  if (!actual || !expected) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(`Bearer ${expected}`);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function isPaymentOperator(request: Request) {
  return safeMatch(
    request.headers.get("authorization"),
    process.env.PAYMENT_OPERATIONS_SECRET,
  );
}

export function isVercelCron(request: Request) {
  return safeMatch(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
  );
}
