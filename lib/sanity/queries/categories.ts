import { defineQuery } from "next-sanity";

/**
 * Get all categories
 * Used for navigation and filters
 */
export const ALL_CATEGORIES_QUERY = defineQuery(`*[
  _type == "category"
] | order(coalesce(displayOrder, 2147483647) asc, title asc) {
  _id,
  title,
  "slug": slug.current,
  "parentId": parentCategory._ref,
  displayOrder,
  "image": image{
    asset->{
      _id,
      url
    },
    hotspot
  }
}`);

/**
 * Get category by slug
 */
export const CATEGORY_BY_SLUG_QUERY = defineQuery(`*[
  _type == "category"
  && slug.current == $slug
][0] {
  _id,
  title,
  "slug": slug.current,
  "parentId": parentCategory._ref,
  displayOrder,
  "image": image{
    asset->{
      _id,
      url
    },
    hotspot
  }
}`);
