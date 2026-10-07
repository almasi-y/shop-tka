import { defineQuery } from "next-sanity";

export const WISHLIST_PRODUCT_QUERY = defineQuery(`*[
  _type == "product" && _id == $productId
][0] {
  _id,
  "name": coalesce(title, name)
}`);

export const WISHLIST_ITEM_QUERY = defineQuery(`*[
  _type == "wishlistItem"
  && clerkUserId == $clerkUserId
  && product._ref == $productId
] | order(createdAt desc)[0] {
  _id,
  createdAt
}`);

export const WISHLIST_COUNT_QUERY = defineQuery(`count(*[
  _type == "wishlistItem"
  && clerkUserId == $clerkUserId
  && defined(product->._id)
])`);

export const WISHLIST_BY_USER_QUERY = defineQuery(`*[
  _type == "wishlistItem"
  && clerkUserId == $clerkUserId
  && defined(product->._id)
] | order(createdAt desc) {
  _id,
  createdAt,
  product->{
    _id,
    "name": coalesce(title, name),
    "slug": slug.current,
    price,
    "images": images[0...4]{
      _key,
      asset->{
        _id,
        url
      }
    },
    category->{
      _id,
      title,
      "slug": slug.current
    },
    brand->{
      _id,
      title,
      "slug": slug.current
    },
    stock
  }
}`);
