import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { defineField, defineType } from "sanity";

export const emailDeliveryType = defineType({
  name: "emailDelivery",
  title: "Email Delivery",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: "eventKey",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "kind",
      type: "string",
      readOnly: true,
      options: {
        list: [
          { title: "Payment confirmation", value: "payment_confirmation" },
          { title: "Order update", value: "order_update" },
          { title: "Return update", value: "return_update" },
          { title: "Restock notification", value: "restock" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "recipient",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "sourceDocumentId",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "status",
      type: "string",
      readOnly: true,
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Sending", value: "sending" },
          { title: "Sent", value: "sent" },
          { title: "Failed", value: "failed" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "attemptId", type: "string", readOnly: true }),
    defineField({
      name: "attempts",
      type: "number",
      readOnly: true,
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({ name: "providerMessageId", type: "string", readOnly: true }),
    defineField({ name: "lastError", type: "text", readOnly: true }),
    defineField({
      name: "createdAt",
      type: "datetime",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "updatedAt",
      type: "datetime",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "sentAt", type: "datetime", readOnly: true }),
  ],
  preview: {
    select: {
      kind: "kind",
      recipient: "recipient",
      status: "status",
    },
    prepare({ kind, recipient, status }) {
      return {
        title: `${kind ?? "Email"} · ${recipient ?? "Unknown recipient"}`,
        subtitle: status ?? "pending",
      };
    },
  },
});
