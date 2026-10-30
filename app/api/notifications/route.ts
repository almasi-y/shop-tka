import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  NOTIFICATION_FEED_QUERY,
  NOTIFICATION_STATE_BY_USER_QUERY,
} from "@/lib/sanity/queries/notifications";
import { writeClient } from "@/sanity/lib/client";

const MAX_NOTIFICATIONS = 50;
const MAX_READ_KEYS = 500;

type NotificationFeedSource = {
  orders: Array<{
    _id: string;
    orderNumber: string | null;
    trackingEvents: Array<{
      _key: string;
      status: string | null;
      occurredAt: string;
      publicMessage: string;
    }> | null;
  }>;
  returns: Array<{
    _id: string;
    requestNumber: string | null;
    status: string | null;
    requestedAt: string | null;
    reviewedAt: string | null;
    completedAt: string | null;
    _updatedAt: string;
  }>;
  restocks: Array<{
    _id: string;
    notifiedAt: string | null;
    _updatedAt: string;
    productName: string | null;
    productSlug: string | null;
  }>;
  state: { _id: string; readKeys: string[] | null } | null;
};

type CustomerNotification = {
  key: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
  read: boolean;
};

const markReadSchema = z.object({
  keys: z.array(z.string().trim().min(1).max(300)).min(1).max(100),
});

const ORDER_TITLES: Record<string, string> = {
  payment_confirmed: "Payment confirmed",
  processing: "Order is being prepared",
  packed: "Order packed",
  dispatched: "Order dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Order delivered",
  cancelled: "Order cancelled",
};

const RETURN_TITLES: Record<string, string> = {
  pending: "Return request received",
  approved: "Return request approved",
  rejected: "Return request declined",
  received: "Returned item received",
  completed: "Return request completed",
  cancelled: "Return request cancelled",
};

function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function returnMessage(status: string, requestNumber: string) {
  const subject = requestNumber ? `Return ${requestNumber}` : "Your return request";
  switch (status) {
    case "approved":
      return `${subject} has been approved. Check My Returns for the next steps.`;
    case "rejected":
      return `${subject} was not approved. Check My Returns for the review details.`;
    case "received":
      return `${subject} has been received and is being processed.`;
    case "completed":
      return `${subject} has been completed.`;
    case "cancelled":
      return `${subject} has been cancelled.`;
    default:
      return `${subject} was submitted for admin review.`;
  }
}

function buildNotifications(source: NotificationFeedSource) {
  const readKeys = new Set(source.state?.readKeys ?? []);
  const notifications: CustomerNotification[] = [];

  for (const order of source.orders) {
    for (const event of order.trackingEvents ?? []) {
      const key = `order:${order._id}:${event._key}`;
      const eventTitle = ORDER_TITLES[event.status ?? ""] ?? "Order update";
      notifications.push({
        key,
        title: order.orderNumber
          ? `${eventTitle} · ${order.orderNumber}`
          : eventTitle,
        message: event.publicMessage,
        href: `/orders/${order._id}`,
        occurredAt: event.occurredAt,
        read: readKeys.has(key),
      });
    }
  }

  for (const request of source.returns) {
    const status = request.status ?? "pending";
    const key = `return:${request._id}:${status}`;
    notifications.push({
      key,
      title: RETURN_TITLES[status] ?? "Return request updated",
      message: returnMessage(status, request.requestNumber ?? ""),
      href: "/returns",
      occurredAt:
        request.completedAt ??
        request.reviewedAt ??
        request.requestedAt ??
        request._updatedAt,
      read: readKeys.has(key),
    });
  }

  for (const subscription of source.restocks) {
    const key = `restock:${subscription._id}:notified`;
    notifications.push({
      key,
      title: "Back in stock",
      message: `${subscription.productName ?? "A product you requested"} is available again.`,
      href: subscription.productSlug
        ? `/products/${subscription.productSlug}`
        : "/",
      occurredAt: subscription.notifiedAt ?? subscription._updatedAt,
      read: readKeys.has(key),
    });
  }

  return notifications
    .filter((notification) => !Number.isNaN(Date.parse(notification.occurredAt)))
    .sort(
      (first, second) =>
        Date.parse(second.occurredAt) - Date.parse(first.occurredAt),
    )
    .slice(0, MAX_NOTIFICATIONS);
}

export async function GET() {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return privateJson(
        { error: "Notifications are not configured" },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    const source = await writeClient.fetch<NotificationFeedSource>(
      NOTIFICATION_FEED_QUERY,
      { clerkUserId: userId },
    );
    const notifications = buildNotifications(source);
    return privateJson({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read)
        .length,
    });
  } catch (error) {
    console.error("Notification lookup failed", error);
    return privateJson(
      { error: "Unable to load notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return privateJson(
        { error: "Notifications are not configured" },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    const input = markReadSchema.parse(await request.json());
    const existing = await writeClient.fetch<{
      _id: string;
      readKeys: string[] | null;
    } | null>(NOTIFICATION_STATE_BY_USER_QUERY, { clerkUserId: userId });
    const combinedKeys = [
      ...new Set([...(existing?.readKeys ?? []), ...input.keys]),
    ].slice(-MAX_READ_KEYS);
    const updatedAt = new Date().toISOString();

    if (existing?._id) {
      await writeClient
        .patch(existing._id)
        .set({ readKeys: combinedKeys, updatedAt })
        .commit();
    } else {
      await writeClient.create({
        _type: "notificationState",
        clerkUserId: userId,
        readKeys: combinedKeys,
        updatedAt,
      });
    }

    return privateJson({ saved: true, readKeys: combinedKeys });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return privateJson(
        { error: error.issues[0]?.message ?? "Invalid notification update" },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return privateJson({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Notification update failed", error);
    return privateJson(
      { error: "Unable to update notifications" },
      { status: 500 },
    );
  }
}
