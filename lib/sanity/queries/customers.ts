import { defineQuery } from "next-sanity";

export const CUSTOMER_ADDRESS_BY_USER_QUERY = defineQuery(`*[
  _type == "customer"
  && clerkUserId == $clerkUserId
] | order(createdAt desc)[0] {
  _id,
  email,
  name,
  shippingAddress {
    name,
    line1,
    line2,
    city,
    postcode,
    county,
    country
  }
}`);
