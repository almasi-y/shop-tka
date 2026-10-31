import "server-only";

import crypto from "node:crypto";
import { defineQuery } from "next-sanity";
import { Resend } from "resend";
import { writeClient } from "@/sanity/lib/client";

type EmailKind =
  | "payment_confirmation"
  | "order_update"
  | "return_update"
  | "restock";

type DeliveryDocument = {
  _id: string;
  _rev: string;
  status: "pending" | "sending" | "sent" | "failed";
  updatedAt: string;
};

type TransactionalEmail = {
  eventKey: string;
  kind: EmailKind;
  to: string;
  subject: string;
  html: string;
  text: string;
  sourceDocumentId?: string;
};

export type EmailDeliveryResult =
  | "sent"
  | "already_sent"
  | "in_progress"
  | "failed"
  | "not_configured";

const SENDING_LEASE_MS = 10 * 60 * 1_000;
const EMAIL_DELIVERY_QUERY = defineQuery(/* groq */ `
  *[_type == "emailDelivery" && _id == $id][0]{
    _id,
    _rev,
    status,
    updatedAt
  }
`);

function deliveryId(eventKey: string) {
  // A deterministic operational ledger ID is intentional: createIfNotExists
  // becomes the cross-request idempotency lock for one business event.
  return `emailDelivery.${crypto.createHash("sha256").update(eventKey).digest("hex")}`;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 1_000)
    : "Unknown email delivery error";
}

async function claimDelivery(input: TransactionalEmail) {
  const _id = deliveryId(input.eventKey);
  const now = new Date().toISOString();

  await writeClient.createIfNotExists({
    _id,
    _type: "emailDelivery",
    eventKey: input.eventKey,
    kind: input.kind,
    recipient: input.to,
    sourceDocumentId: input.sourceDocumentId,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });

  const current = await writeClient.fetch<DeliveryDocument | null>(
    EMAIL_DELIVERY_QUERY,
    { id: _id },
  );
  if (!current) return { state: "in_progress" as const, id: _id };
  if (current.status === "sent") {
    return { state: "already_sent" as const, id: _id };
  }
  if (
    current.status === "sending" &&
    Date.now() - Date.parse(current.updatedAt) < SENDING_LEASE_MS
  ) {
    return { state: "in_progress" as const, id: _id };
  }

  const attemptId = crypto.randomUUID();
  try {
    await writeClient
      .patch(_id)
      .ifRevisionId(current._rev)
      .set({
        status: "sending",
        attemptId,
        updatedAt: now,
      })
      .unset(["lastError"])
      .inc({ attempts: 1 })
      .commit();
    return { state: "claimed" as const, id: _id, attemptId };
  } catch {
    return { state: "in_progress" as const, id: _id };
  }
}

export async function sendTransactionalEmail(
  input: TransactionalEmail,
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    console.error("Transactional email is not configured", {
      eventKey: input.eventKey,
      missingApiKey: !apiKey,
      missingFrom: !from,
    });
    return "not_configured";
  }

  let claim: Awaited<ReturnType<typeof claimDelivery>>;
  try {
    claim = await claimDelivery(input);
  } catch (error) {
    // The email ledger is deliberately outside all order/payment mutations.
    console.error("Unable to claim transactional email delivery", {
      eventKey: input.eventKey,
      kind: input.kind,
      error: safeErrorMessage(error),
    });
    return "failed";
  }
  if (claim.state === "already_sent") return "already_sent";
  if (claim.state === "in_progress") return "in_progress";

  const resend = new Resend(apiKey);
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(input.eventKey)
    .digest("hex");

  try {
    const { data, error } = await resend.emails.send(
      {
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: {
          "X-Entity-Ref-ID": idempotencyKey,
        },
      },
      { idempotencyKey },
    );
    if (error || !data?.id) {
      throw new Error(error?.message ?? "Resend did not return a message ID");
    }

    const sentAt = new Date().toISOString();
    await writeClient
      .patch(claim.id)
      .set({
        status: "sent",
        providerMessageId: data.id,
        sentAt,
        updatedAt: sentAt,
      })
      .unset(["lastError"])
      .commit();
    return "sent";
  } catch (error) {
    const failedAt = new Date().toISOString();
    console.error("Transactional email delivery failed", {
      eventKey: input.eventKey,
      kind: input.kind,
      error: safeErrorMessage(error),
    });
    await writeClient
      .patch(claim.id)
      .set({
        status: "failed",
        lastError: safeErrorMessage(error),
        updatedAt: failedAt,
      })
      .commit()
      .catch((ledgerError) =>
        console.error("Unable to record email failure", ledgerError),
      );
    return "failed";
  }
}

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function storeUrl(path: string) {
  const base = (
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://shop.codeinnovatorsafrica.com"
  ).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function emailLayout({
  preheader,
  title,
  body,
  actionLabel,
  actionUrl,
}: {
  preheader: string;
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
}) {
  return `<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px">
<tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:18px;overflow:hidden">
<tr><td style="background:#404695;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:700">Code Innovators Shop</td></tr>
<tr><td style="padding:32px 28px"><h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:#262A59">${escapeHtml(title)}</h1>${body}
<p style="margin:28px 0 8px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#404695;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700">${escapeHtml(actionLabel)}</a></p>
</td></tr>
<tr><td style="padding:20px 28px;background:#EDEFFE;color:#52525b;font-size:12px;line-height:1.6">This is an automated no-reply email. For assistance, contact us on WhatsApp at <a href="https://wa.me/254114960666" style="color:#404695">+254 114 960 666</a>.</td></tr>
</table></td></tr></table></body></html>`;
}
