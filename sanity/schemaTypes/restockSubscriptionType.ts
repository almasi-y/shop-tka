import { BellIcon } from "@sanity/icons/Bell";
import { defineField, defineType } from "sanity";

export const restockSubscriptionType = defineType({
  name: "restockSubscription",
  title: "Restock Subscription",
  type: "document",
  icon: BellIcon,
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
      name: "email",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Notified", value: "notified" },
          { title: "Cancelled", value: "cancelled" },
        ],
        layout: "radio",
      },
      initialValue: "pending",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "requestedAt",
      type: "datetime",
      readOnly: true,
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "notifiedAt",
      type: "datetime",
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      product: "product.title",
      email: "email",
      status: "status",
    },
    prepare({ product, email, status }) {
      return {
        title: product ?? "Unknown product",
        subtitle: `${email ?? "Unknown customer"} • ${status ?? "pending"}`,
      };
    },
  },
});
