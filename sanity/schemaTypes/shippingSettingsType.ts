import { EarthGlobeIcon } from "@sanity/icons/EarthGlobe";
import { defineField, defineType } from "sanity";

export const shippingSettingsType = defineType({
  name: "shippingSettings",
  title: "Shipping Settings",
  type: "document",
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: "mombasaFee",
      title: "Mombasa fee",
      type: "number",
      initialValue: 300,
      description: "Delivery fee for Mombasa County in KES.",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "coastalFee",
      title: "Coastal counties fee",
      type: "number",
      initialValue: 500,
      description:
        "Delivery fee for Kilifi, Kwale, Lamu, Taita-Taveta and Tana River in KES.",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "nairobiFee",
      title: "Nairobi fee",
      type: "number",
      initialValue: 700,
      description: "Delivery fee for Nairobi County in KES.",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "otherKenyaFee",
      title: "Other Kenyan counties fee",
      type: "number",
      initialValue: 1000,
      description:
        "Delivery fee for every other Kenyan county, including Kisumu and Turkana, in KES.",
      validation: (rule) => rule.required().integer().min(0),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Kenya shipping rates",
        subtitle: "Checkout delivery fees",
      };
    },
  },
});
