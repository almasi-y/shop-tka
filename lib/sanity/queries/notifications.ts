import { defineQuery } from "next-sanity";

export const NOTIFICATION_FEED_QUERY = defineQuery(`{
  "orders": *[
    _type == "order"
    && clerkUserId == $clerkUserId
    && !(_id in path("drafts.**"))
  ] {
    _id,
    orderNumber,
    trackingEvents[defined(_key) && defined(occurredAt) && defined(publicMessage)] {
      _key,
      status,
      occurredAt,
      publicMessage
    }
  },
  "returns": *[
    _type == "returnRequest"
    && clerkUserId == $clerkUserId
    && !(_id in path("drafts.**"))
  ] {
    _id,
    requestNumber,
    status,
    requestedAt,
    reviewedAt,
    completedAt,
    _updatedAt
  },
  "restocks": *[
    _type == "restockSubscription"
    && clerkUserId == $clerkUserId
    && status == "notified"
    && !(_id in path("drafts.**"))
  ] {
    _id,
    notifiedAt,
    _updatedAt,
    "productName": coalesce(product->title, product->name),
    "productSlug": product->slug.current
  },
  "state": *[
    _type == "notificationState"
    && clerkUserId == $clerkUserId
  ] | order(updatedAt desc)[0] {
    _id,
    readKeys
  }
}`);

export const NOTIFICATION_STATE_BY_USER_QUERY = defineQuery(`*[
  _type == "notificationState"
  && clerkUserId == $clerkUserId
] | order(updatedAt desc)[0] {
  _id,
  readKeys
}`);
