import { defineQuery } from "next-sanity";

export const ORDERS_BY_USER_QUERY = defineQuery(`*[
  _type == "order"
  && clerkUserId == $clerkUserId
] | order(createdAt desc) {
  _id,
  orderNumber,
  "total": coalesce(totalPrice, total),
  status,
  createdAt,
  "itemCount": select(defined(products) => count(products), count(items)),
  "itemNames": select(
    defined(products) => products[]->{"value": coalesce(title, name)}.value,
    coalesce(items[].product->title, items[].product->name)
  ),
  "itemImages": select(
    defined(products) => products[]->images[0].asset->url,
    items[].product->images[0].asset->url
  )
}`);

export const ORDER_BY_ID_QUERY = defineQuery(`*[
  _type == "order"
  && _id == $id
][0] {
  _id,
  orderNumber,
  clerkUserId,
  "email": coalesce(customerEmail, email),
  products[]->{
    _id,
    "name": coalesce(title, name),
    "slug": slug.current,
    "image": images[0]{
      asset->{
        _id,
        url
      }
    }
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
      "slug": slug.current,
      "image": images[0]{
        asset->{
          _id,
          url
        }
      }
    }
  },
  "total": coalesce(totalPrice, total),
  status,
  "address": coalesce(shippingAddress, address),
  paystackReference,
  createdAt
}`);

export const ORDER_BY_PAYSTACK_REFERENCE_QUERY = defineQuery(`*[
  _type == "order"
  && paystackReference == $paystackReference
][0]{ _id }`);

export const ORDER_STATUS_BY_PAYSTACK_REFERENCE_QUERY = defineQuery(`*[
  _type == "order"
  && paystackReference == $paystackReference
][0]{
  _id,
  clerkUserId,
  status
}`);
