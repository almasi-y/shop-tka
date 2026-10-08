import crypto from "node:crypto";

const TRACKING_PREFIX = "CIS";

export function createTrackingNumber(reference: string, createdAt: string) {
  const year = new Date(createdAt).getUTCFullYear();
  const identifier = crypto
    .createHash("sha256")
    .update(`tracking:${reference}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  return `${TRACKING_PREFIX}-${year}-${identifier}`;
}

export function createTrackingEventKey(
  reference: string,
  status: string,
  occurredAt: string,
) {
  return crypto
    .createHash("sha1")
    .update(`${reference}:${status}:${occurredAt}`)
    .digest("hex")
    .slice(0, 16);
}
