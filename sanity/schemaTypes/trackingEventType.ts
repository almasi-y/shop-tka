import { ClockIcon } from "@sanity/icons/Clock";
import { defineField, defineType } from "sanity";

export const trackingEventType = defineType({
  name: "trackingEvent",
  title: "Tracking Event",
  type: "object",
  icon: ClockIcon,
  fields: [
    defineField({
      name: "status",
      title: "Stage",
      type: "string",
      options: {
        list: [
          { title: "Payment confirmed", value: "payment_confirmed" },
          { title: "Processing", value: "processing" },
          { title: "Packed", value: "packed" },
          { title: "Dispatched", value: "dispatched" },
          { title: "Out for delivery", value: "out_for_delivery" },
          { title: "Delivered", value: "delivered" },
          { title: "Cancelled", value: "cancelled" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "occurredAt",
      title: "Date and time",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publicMessage",
      title: "Customer update",
      type: "string",
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: "location",
      type: "string",
      description: "Optional customer-visible location for this update.",
    }),
    defineField({
      name: "source",
      type: "string",
      initialValue: "admin",
      options: {
        list: [
          { title: "System", value: "system" },
          { title: "Admin", value: "admin" },
          { title: "Courier", value: "courier" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "actorName",
      title: "Updated by",
      type: "string",
      description: "Optional display name for the person who recorded the update.",
    }),
    defineField({
      name: "internalNote",
      type: "text",
      rows: 2,
      description: "Private operational note. Never show this to customers.",
    }),
  ],
  preview: {
    select: {
      title: "publicMessage",
      status: "status",
      occurredAt: "occurredAt",
    },
    prepare({ title, status, occurredAt }) {
      return {
        title: title ?? status ?? "Tracking update",
        subtitle: occurredAt
          ? new Date(occurredAt).toLocaleString("en-KE")
          : "No timestamp",
      };
    },
  },
});
