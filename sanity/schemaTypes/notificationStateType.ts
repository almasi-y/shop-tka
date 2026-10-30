import { BellIcon } from "@sanity/icons/Bell";
import { defineArrayMember, defineField, defineType } from "sanity";

export const notificationStateType = defineType({
  name: "notificationState",
  title: "Notification State",
  type: "document",
  icon: BellIcon,
  fields: [
    defineField({
      name: "clerkUserId",
      title: "Clerk user ID",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "readKeys",
      title: "Read notification keys",
      type: "array",
      readOnly: true,
      of: [defineArrayMember({ type: "string" })],
      validation: (rule) => rule.max(500).unique(),
    }),
    defineField({
      name: "updatedAt",
      type: "datetime",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { clerkUserId: "clerkUserId", updatedAt: "updatedAt" },
    prepare({ clerkUserId, updatedAt }) {
      return {
        title: clerkUserId ?? "Unknown customer",
        subtitle: updatedAt
          ? `Updated ${new Date(updatedAt).toLocaleString()}`
          : "Notification state",
      };
    },
  },
});
