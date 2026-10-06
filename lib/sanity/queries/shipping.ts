import { defineQuery } from "next-sanity";

export const SHIPPING_SETTINGS_QUERY = defineQuery(`*[
  _type == "shippingSettings" && _id == "shippingSettings"
][0] {
  mombasaFee,
  coastalFee,
  nairobiFee,
  otherKenyaFee
}`);
