import { HeartIcon } from "@sanity/icons/Heart";
import { defineField, defineType } from "sanity";

export const wishlistItemType = defineType({
  name: "wishlistItem",
  title: "Wishlist Item",
  type: "document",
  icon: HeartIcon,
  fields: [
    defineField({
      name: "product",
      type: "reference",
      to: [{ type: "product" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "clerkUserId",
      title: "Clerk user ID",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "createdAt",
      type: "datetime",
      readOnly: true,
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "product.title",
      legacyTitle: "product.name",
      clerkUserId: "clerkUserId",
      media: "product.images.0",
    },
    prepare({ title, legacyTitle, clerkUserId, media }) {
      return {
        title: title ?? legacyTitle ?? "Saved product",
        subtitle: clerkUserId ?? "Unknown customer",
        media,
      };
    },
  },
});