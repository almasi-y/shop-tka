import { defineQuery } from "next-sanity";

export const DELIVERED_ORDERS_FOR_RETURNS_QUERY = defineQuery(`*[
  _type == "order"
  && clerkUserId == $clerkUserId
  && status == "delivered"
] | order(createdAt desc) {
  _id,
  orderNumber,
  createdAt,
  deliveredAt,
  "deliveryDate": coalesce(deliveredAt, _updatedAt, createdAt),
  products[]->{
    _id,
    "name": coalesce(title, name),
    "returnEligibility": coalesce(returnEligibility, "standard"),
    "returnWindowDays": coalesce(returnWindowDays, 14),
    returnPolicyNote
  },
  quantities,
  productPrices,
  "legacyItems": items[]{
    _key,
    quantity,
    priceAtPurchase,
    product->{
      _id,
      "name": coalesce(title, name),
      "returnEligibility": coalesce(returnEligibility, "standard"),
      "returnWindowDays": coalesce(returnWindowDays, 14),
      returnPolicyNote
    }
  }
}`);

export const RETURN_ORDER_BY_ID_QUERY = defineQuery(`*[
  _type == "order"
  && _id == $orderId
][0] {
  _id,
  orderNumber,
  clerkUserId,
  "email": coalesce(customerEmail, email),
  status,
  deliveredAt,
  createdAt,
  "deliveryDate": coalesce(deliveredAt, _updatedAt, createdAt),
  products[]->{
    _id,
    "name": coalesce(title, name),
    "returnEligibility": coalesce(returnEligibility, "standard"),
    "returnWindowDays": coalesce(returnWindowDays, 14),
    returnPolicyNote
  },
  quantities,
  productPrices,
  "legacyItems": items[]{
    _key,
    quantity,
    priceAtPurchase,
    product->{
      _id,
      "name": coalesce(title, name),
      "returnEligibility": coalesce(returnEligibility, "standard"),
      "returnWindowDays": coalesce(returnWindowDays, 14),
      returnPolicyNote
    }
  }
}`);

export const ACTIVE_RETURN_ITEMS_BY_ORDER_QUERY = defineQuery(`*[
  _type == "returnRequest"
  && order._ref == $orderId
  && status in ["pending", "approved", "received", "completed"]
] {
  items[]{
    quantity,
    "productId": product._ref
  }
}`);

export const RETURNS_BY_USER_QUERY = defineQuery(`*[
  _type == "returnRequest"
  && clerkUserId == $clerkUserId
] | order(requestedAt desc) {
  _id,
  requestNumber,
  "orderId": order._ref,
  "orderNumber": order->orderNumber,
  resolution,
  reason,
  notes,
  status,
  adminNotes,
  requestedAt,
  reviewedAt,
  completedAt,
  "evidenceImageUrls": evidenceImages[].asset->url,
  items[]{
    _key,
    quantity,
    productName,
    priceAtPurchase,
    "productId": product._ref
  }
}`);
