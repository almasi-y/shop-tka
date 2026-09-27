import { defineQuery } from "next-sanity";

export const RESTOCK_PRODUCT_QUERY = defineQuery(`*[
  _type == "product" && _id == $productId
][0] {
  _id,
  "name": coalesce(title, name),
  "slug": slug.current,
  stock
}`);

export const ACTIVE_RESTOCK_SUBSCRIPTION_QUERY = defineQuery(`*[
  _type == "restockSubscription"
  && clerkUserId == $clerkUserId
  && product._ref == $productId
  && status == "pending"
] | order(requestedAt desc)[0] {
  _id,
  status,
  requestedAt
}`);
