import { TransferIcon } from "@sanity/icons/Transfer";
import { defineArrayMember, defineField, defineType } from "sanity";

const RETURN_STATUS_OPTIONS = [
  { title: "Pending review", value: "pending" },
  { title: "Approved", value: "approved" },
  { title: "Item received", value: "received" },
  { title: "Rejected", value: "rejected" },
  { title: "Completed", value: "completed" },
];

export const returnRequestType = defineType({
  name: "returnRequest",
  title: "Return Request",
  type: "document",
  icon: TransferIcon,
  groups: [
    { name: "request", title: "Customer Request", default: true },
    { name: "review", title: "Admin Review" },
  ],
  fields: [
    defineField({
      name: "requestNumber",
      type: "string",
      group: "request",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "order",
      type: "reference",
      to: [{ type: "order" }],
      group: "request",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "clerkUserId",
      type: "string",
      group: "request",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "customerEmail",
      type: "string",
      group: "request",
      readOnly: true,
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "resolution",
      type: "string",
      group: "request",
      readOnly: true,
      options: {
        list: [
          { title: "Refund", value: "refund" },
          { title: "Exchange", value: "exchange" },
          { title: "Repair", value: "repair" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "reason",
      type: "string",
      group: "request",
      readOnly: true,
      options: {
        list: [
          { title: "Damaged on arrival", value: "damaged" },
          { title: "Faulty or not working", value: "faulty" },
          { title: "Wrong item received", value: "wrong_item" },
          { title: "Not as described", value: "not_as_described" },
          { title: "Other", value: "other" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "notes",
      title: "Customer notes",
      type: "text",
      rows: 4,
      group: "request",
      readOnly: true,
      validation: (rule) => rule.required().min(5).max(1000),
    }),
    defineField({
      name: "packagingConfirmed",
      title: "Original packaging confirmed",
      type: "boolean",
      group: "request",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "evidenceImages",
      title: "Evidence photos",
      type: "array",
      group: "request",
      readOnly: true,
      description: "Required for damaged or faulty product claims.",
      of: [defineArrayMember({ type: "image" })],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: "items",
      type: "array",
      group: "request",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "product",
              type: "reference",
              to: [{ type: "product" }],
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "productName",
              type: "string",
              description: "Product name captured when the request was made.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "quantity",
              type: "number",
              validation: (rule) => rule.required().integer().min(1),
            }),
            defineField({
              name: "priceAtPurchase",
              type: "number",
              validation: (rule) => rule.required().min(0),
            }),
          ],
          preview: {
            select: {
              title: "productName",
              quantity: "quantity",
              price: "priceAtPurchase",
              media: "product.images.0",
            },
            prepare({ title, quantity, price, media }) {
              return {
                title: title ?? "Product",
                subtitle: `Qty: ${quantity ?? 0} • KSh ${price ?? 0}`,
                media,
              };
            },
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "status",
      type: "string",
      group: "review",
      initialValue: "pending",
      options: { list: RETURN_STATUS_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "adminNotes",
      type: "text",
      rows: 4,
      group: "review",
      description:
        "Customer-visible review update. Approval does not trigger a Paystack refund.",
      validation: (rule) => rule.max(1000),
    }),
    defineField({
      name: "requestedAt",
      type: "datetime",
      group: "request",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "reviewedAt",
      type: "datetime",
      group: "review",
      readOnly: true,
    }),
    defineField({
      name: "completedAt",
      type: "datetime",
      group: "review",
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      requestNumber: "requestNumber",
      email: "customerEmail",
      status: "status",
    },
    prepare({ requestNumber, email, status }) {
      return {
        title: requestNumber ?? "Return request",
        subtitle: `${email ?? "Unknown customer"} • ${status ?? "pending"}`,
      };
    },
  },
});
