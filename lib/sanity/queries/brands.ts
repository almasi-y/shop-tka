import { defineQuery } from "next-sanity";

export const ALL_BRANDS_QUERY = defineQuery(`*[
  _type == "brand"
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  logo{
    asset->{
      _id,
      url
    }
  }
}`);

export const BRANDS_BY_SLUGS_QUERY = defineQuery(`*[
  _type == "brand"
  && slug.current in $slugs
] {
  _id,
  title,
  "slug": slug.current
}`);
