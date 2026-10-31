import "server-only";

import {
  emailLayout,
  escapeHtml,
  sendTransactionalEmail,
  storeUrl,
  type EmailDeliveryResult,
} from "@/lib/email/transactional";
import { writeClient } from "@/sanity/lib/client";
import { defineQuery } from "next-sanity";

type OrderEmailData = {
  _id: string;
  orderNumber: string;
  customerEmail: string;
  total: number;
  trackingNumber: string | null;
  courierName: string | null;
  courierTrackingNumber: string | null;
  courierTrackingUrl: string | null;
  currentLocation: string | null;
  trackingEvents: Array<{
    _key: string;
    status: string;
    occurredAt: string;
    publicMessage: string | null;
    location: string | null;
  }> | null;
};

type ReturnEmailData = {
  _id: string;
  requestNumber: string;
  customerEmail: string;
  status: string;
  adminNotes: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  _updatedAt: string;
};

type RestockSubscription = {
  _id: string;
  email: string;
  product: {
    _id: string;
    name: string;
    slug: string | null;
    stock: number;
  } | null;
};

const ORDER_EMAIL_QUERY = defineQuery(/* groq */ `*[
  _type == "order" && _id == $orderId && !(_id in path("drafts.**"))
][0]{
  _id,
  orderNumber,
  "customerEmail": coalesce(customerEmail, email),
  "total": coalesce(totalPrice, total),
  trackingNumber,
  courierName,
  courierTrackingNumber,
  courierTrackingUrl,
  currentLocation,
  trackingEvents[]{_key, status, occurredAt, publicMessage, location}
}`);

const RETURN_EMAIL_QUERY = defineQuery(/* groq */ `*[
  _type == "returnRequest" && _id == $requestId && !(_id in path("drafts.**"))
][0]{
  _id,
  requestNumber,
  customerEmail,
  status,
  adminNotes,
  reviewedAt,
  completedAt,
  _updatedAt
}`);

const RESTOCK_SUBSCRIPTIONS_QUERY = defineQuery(/* groq */ `*[
  _type == "restockSubscription"
  && status == "pending"
  && product._ref == $productId
  && !(_id in path("drafts.**"))
]{
  _id,
  email,
  product->{
    _id,
    "name": coalesce(title, name),
    "slug": slug.current,
    "stock": coalesce(stock, 0)
  }
}`);

const formatCurrency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

const ORDER_STATUS_TITLES: Record<string, string> = {
  processing: "Your order is being prepared",
  packed: "Your order has been packed",
  dispatched: "Your order has been dispatched",
  out_for_delivery: "Your order is out for delivery",
  delivered: "Your order has been delivered",
  cancelled: "Your order has been cancelled",
};

const RETURN_STATUS_TITLES: Record<string, string> = {
  pending: "Return request received",
  approved: "Return request approved",
  received: "Returned item received",
  rejected: "Return request update",
  completed: "Return request completed",
};

async function getOrder(orderId: string) {
  return writeClient.fetch<OrderEmailData | null>(ORDER_EMAIL_QUERY, {
    orderId,
  });
}

export async function sendPaymentConfirmationEmail(orderId: string) {
  const order = await getOrder(orderId);
  if (!order?.customerEmail) return "failed" satisfies EmailDeliveryResult;

  const orderUrl = storeUrl(`/orders/${encodeURIComponent(order._id)}`);
  const total = formatCurrency.format(order.total ?? 0);
  const body = `
    <p style="font-size:16px;line-height:1.7;color:#3f3f46">We have confirmed your payment and received order <strong>${escapeHtml(order.orderNumber)}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background:#fafafa;border:1px solid #e4e4e7;border-radius:12px">
      <tr><td style="padding:12px 16px;color:#71717a">Amount paid</td><td align="right" style="padding:12px 16px;font-weight:700">${escapeHtml(total)}</td></tr>
      <tr><td style="padding:12px 16px;color:#71717a;border-top:1px solid #e4e4e7">Tracking number</td><td align="right" style="padding:12px 16px;font-weight:700;border-top:1px solid #e4e4e7">${escapeHtml(order.trackingNumber ?? "Pending")}</td></tr>
    </table>`;

  return sendTransactionalEmail({
    eventKey: `order:${order._id}:payment_confirmation`,
    kind: "payment_confirmation",
    to: order.customerEmail,
    subject: `Payment confirmed · ${order.orderNumber}`,
    html: emailLayout({
      preheader: `Payment confirmed for ${order.orderNumber}`,
      title: "Payment confirmed",
      body,
      actionLabel: "View your order",
      actionUrl: orderUrl,
    }),
    text: `Payment confirmed for ${order.orderNumber}. Amount paid: ${total}. Tracking number: ${order.trackingNumber ?? "Pending"}. View your order: ${orderUrl}. This is an automated no-reply email.`,
    sourceDocumentId: order._id,
  });
}

export async function sendOrderTrackingEmail(
  orderId: string,
  trackingEventKey: string,
) {
  const order = await getOrder(orderId);
  const event = order?.trackingEvents?.find(
    (trackingEvent) => trackingEvent._key === trackingEventKey,
  );
  if (!order?.customerEmail || !event) {
    return "failed" satisfies EmailDeliveryResult;
  }

  const title = ORDER_STATUS_TITLES[event.status] ?? "Your order was updated";
  const orderUrl = storeUrl(`/orders/${encodeURIComponent(order._id)}`);
  const courierDetails = [
    order.courierName,
    order.courierTrackingNumber,
    event.location ?? order.currentLocation,
  ].filter(Boolean);
  const body = `
    <p style="font-size:16px;line-height:1.7;color:#3f3f46">${escapeHtml(event.publicMessage ?? title)}</p>
    <p style="font-size:14px;line-height:1.7;color:#71717a"><strong>Order:</strong> ${escapeHtml(order.orderNumber)}<br><strong>Tracking:</strong> ${escapeHtml(order.trackingNumber ?? "Pending")}${courierDetails.length ? `<br><strong>Delivery details:</strong> ${escapeHtml(courierDetails.join(" · "))}` : ""}</p>`;

  return sendTransactionalEmail({
    eventKey: `order:${order._id}:tracking:${event._key}`,
    kind: "order_update",
    to: order.customerEmail,
    subject: `${title} · ${order.orderNumber}`,
    html: emailLayout({
      preheader: `${title} for ${order.orderNumber}`,
      title,
      body,
      actionLabel: order.courierTrackingUrl
        ? "Track with courier"
        : "View order tracking",
      actionUrl: order.courierTrackingUrl ?? orderUrl,
    }),
    text: `${title}. ${event.publicMessage ?? ""} Order: ${order.orderNumber}. Tracking: ${order.trackingNumber ?? "Pending"}. View tracking: ${order.courierTrackingUrl ?? orderUrl}. This is an automated no-reply email.`,
    sourceDocumentId: order._id,
  });
}

export async function sendReturnStatusEmail(
  requestId: string,
) {
  const request = await writeClient.fetch<ReturnEmailData | null>(
    RETURN_EMAIL_QUERY,
    { requestId },
  );
  if (!request?.customerEmail) return "failed" satisfies EmailDeliveryResult;

  const title =
    RETURN_STATUS_TITLES[request.status] ?? "Your return request was updated";
  const eventToken =
    request.completedAt ?? request.reviewedAt ?? request._updatedAt;
  const returnsUrl = storeUrl("/returns");
  const body = `<p style="font-size:16px;line-height:1.7;color:#3f3f46">Your return request <strong>${escapeHtml(request.requestNumber)}</strong> is now <strong>${escapeHtml(request.status)}</strong>.</p>${request.adminNotes ? `<p style="padding:14px 16px;background:#fafafa;border-left:4px solid #404695;line-height:1.7">${escapeHtml(request.adminNotes)}</p>` : ""}`;

  return sendTransactionalEmail({
    eventKey: `return:${request._id}:${request.status}:${eventToken}`,
    kind: "return_update",
    to: request.customerEmail,
    subject: `${title} · ${request.requestNumber}`,
    html: emailLayout({
      preheader: `${title} for ${request.requestNumber}`,
      title,
      body,
      actionLabel: "View your return",
      actionUrl: returnsUrl,
    }),
    text: `${title}. Return ${request.requestNumber} is ${request.status}. ${request.adminNotes ?? ""} View your return: ${returnsUrl}. This is an automated no-reply email.`,
    sourceDocumentId: request._id,
  });
}

export async function retryRecentCustomerEmails() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1_000).toISOString();
  const retryCandidatesQuery = defineQuery(/* groq */ `{
    "orders": *[
      _type == "order"
      && createdAt >= $since
      && !(_id in path("drafts.**"))
    ] | order(createdAt desc)[0...25]{
      _id,
      "trackingEvents": trackingEvents[source == "admin" && defined(_key)]{_key}
    },
    "returns": *[
      _type == "returnRequest"
      && _updatedAt >= $since
      && !(_id in path("drafts.**"))
    ] | order(_updatedAt desc)[0...25]{_id},
    "restocks": *[
      _type == "restockSubscription"
      && status == "pending"
      && defined(product._ref)
      && !(_id in path("drafts.**"))
    ][0...25]{
      "productId": product._ref,
      "stock": product->stock
    }
  }`);
  const candidates = await writeClient.fetch<{
    orders: Array<{
      _id: string;
      trackingEvents: Array<{ _key: string }> | null;
    }>;
    returns: Array<{ _id: string }>;
    restocks: Array<{ productId: string | null; stock: number | null }>;
  }>(
    retryCandidatesQuery,
    { since },
  );

  let attempted = 0;
  const restockProductIds = [
    ...new Set(
      candidates.restocks
        .filter((candidate) => (candidate.stock ?? 0) > 0)
        .map((candidate) => candidate.productId)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  ];
  for (const order of candidates.orders) {
    await sendPaymentConfirmationEmail(order._id);
    attempted += 1;
    for (const event of order.trackingEvents ?? []) {
      await sendOrderTrackingEmail(order._id, event._key);
      attempted += 1;
    }
  }
  for (const request of candidates.returns) {
    await sendReturnStatusEmail(request._id);
    attempted += 1;
  }
  for (const productId of restockProductIds) {
    await sendRestockEmails(productId);
    attempted += 1;
  }

  return { attempted };
}

export async function sendRestockEmails(productId: string) {
  const subscriptions = await writeClient.fetch<RestockSubscription[]>(
    RESTOCK_SUBSCRIPTIONS_QUERY,
    { productId },
  );
  const available = subscriptions.filter(
    (subscription) => (subscription.product?.stock ?? 0) > 0,
  );
  let sent = 0;

  for (const subscription of available) {
    const product = subscription.product;
    if (!product) continue;
    const productUrl = storeUrl(
      product.slug
        ? `/products/${encodeURIComponent(product.slug)}`
        : "/",
    );
    const result = await sendTransactionalEmail({
      eventKey: `restock:${subscription._id}:${product._id}`,
      kind: "restock",
      to: subscription.email,
      subject: `${product.name} is back in stock`,
      html: emailLayout({
        preheader: `${product.name} is available again`,
        title: "Back in stock",
        body: `<p style="font-size:16px;line-height:1.7;color:#3f3f46"><strong>${escapeHtml(product.name)}</strong> is available again. Stock can sell quickly, so visit the product page if you still need it.</p>`,
        actionLabel: "View product",
        actionUrl: productUrl,
      }),
      text: `${product.name} is back in stock. View it here: ${productUrl}. This is an automated no-reply email.`,
      sourceDocumentId: subscription._id,
    });

    if (result === "sent" || result === "already_sent") {
      const notifiedAt = new Date().toISOString();
      await writeClient
        .patch(subscription._id)
        .set({ status: "notified", notifiedAt })
        .commit();
      sent += 1;
    }
  }

  return { eligible: available.length, sent };
}
