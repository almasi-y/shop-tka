import { defineQuery } from "next-sanity";

export const ORDERS_LAST_7_DAYS_QUERY = defineQuery(`*[
  _type == "order"
  && createdAt >= $startDate
  && !(_id in path("drafts.**"))
] | order(createdAt desc) {
  _id,
  orderNumber,
  "total": coalesce(totalPrice, total),
  status,
  createdAt,
  "itemCount": select(defined(products) => count(products), count(items)),
  products[]->{
    "productName": coalesce(title, name),
    "productId": _id,
    price
  },
  quantities,
  productPrices,
  "legacyItems": items[]{
    quantity,
    priceAtPurchase,
    "productName": coalesce(product->title, product->name),
    "productId": product->_id
  }
}`);

export const ORDER_STATUS_DISTRIBUTION_QUERY = defineQuery(`{
  "paid": count(*[_type == "order" && status == "paid" && !(_id in path("drafts.**"))]),
  "shipped": count(*[_type == "order" && status == "shipped" && !(_id in path("drafts.**"))]),
  "delivered": count(*[_type == "order" && status == "delivered" && !(_id in path("drafts.**"))]),
  "cancelled": count(*[_type == "order" && status == "cancelled" && !(_id in path("drafts.**"))])
}`);

export const TOP_SELLING_PRODUCTS_QUERY = defineQuery(`*[
  _type == "order"
  && status in ["paid", "shipped", "delivered"]
  && !(_id in path("drafts.**"))
] {
  products[]->{
    "productId": _id,
    "productName": coalesce(title, name),
    "productPrice": price
  },
  quantities,
  productPrices,
  "legacyItems": items[]{
    "productId": product->_id,
    "productName": coalesce(product->title, product->name),
    "productPrice": product->price,
    quantity
  }
}`);

export const PRODUCTS_INVENTORY_QUERY = defineQuery(`*[_type == "product"] {
  _id,
  "name": coalesce(title, name),
  price,
  stock,
  "category": category->title
}`);

export const UNFULFILLED_ORDERS_QUERY = defineQuery(`*[
  _type == "order"
  && status == "paid"
  && !(_id in path("drafts.**"))
] | order(createdAt asc) {
  _id,
  orderNumber,
  "total": coalesce(totalPrice, total),
  createdAt,
  "email": coalesce(customerEmail, email),
  "itemCount": select(defined(products) => count(products), count(items))
}`);

export const REVENUE_BY_PERIOD_QUERY = defineQuery(`{
  "currentPeriod": math::sum(*[
    _type == "order"
    && status in ["paid", "shipped", "delivered"]
    && createdAt >= $currentStart
    && !(_id in path("drafts.**"))
  ]{"value": coalesce(totalPrice, total)}.value),
  "previousPeriod": math::sum(*[
    _type == "order"
    && status in ["paid", "shipped", "delivered"]
    && createdAt >= $previousStart
    && createdAt < $currentStart
    && !(_id in path("drafts.**"))
  ]{"value": coalesce(totalPrice, total)}.value),
  "currentOrderCount": count(*[
    _type == "order"
    && createdAt >= $currentStart
    && !(_id in path("drafts.**"))
  ]),
  "previousOrderCount": count(*[
    _type == "order"
    && createdAt >= $previousStart
    && createdAt < $currentStart
    && !(_id in path("drafts.**"))
  ])
}`);
