import { defineQuery } from "next-sanity";

export const CART_BY_USER_QUERY = defineQuery(`*[
  _type == "shoppingCart"
  && clerkUserId == $clerkUserId
] | order(updatedAt desc)[0] {
  _id,
  updatedAt,
  items[]{
    _key,
    quantity,
    "productId": product._ref,
    "productExists": defined(product->._id),
    "name": coalesce(product->title, product->name, productName),
    "price": coalesce(product->price, priceAtSave),
    "image": coalesce(product->images[0].asset->url, imageUrl),
    "slug": coalesce(product->slug.current, slug)
  }
}`);

export const CART_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && _id in $productIds
] {
  _id,
  "name": coalesce(title, name),
  price,
  "image": images[0].asset->url,
  "slug": slug.current
}`);

export const CART_DOCUMENT_BY_USER_QUERY = defineQuery(`*[
  _type == "shoppingCart"
  && clerkUserId == $clerkUserId
] | order(updatedAt desc)[0] {
  _id
}`);
