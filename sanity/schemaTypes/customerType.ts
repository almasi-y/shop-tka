import { UserIcon } from "@sanity/icons/User";
import { defineField, defineType } from "sanity";

export const customerType = defineType({
  name: "customer",
  title: "Customer",
  type: "document",
  icon: UserIcon,
  groups: [
    { name: "details", title: "Customer Details", default: true },
    { name: "paystack", title: "Paystack" },
  ],
  fields: [
    defineField({
      name: "email",
      type: "string",
      group: "details",
      validation: (rule) => [rule.required().error("Email is required")],
    }),
    defineField({
      name: "name",
      type: "string",
      group: "details",
      description: "Customer's full name",
    }),
    defineField({
      name: "clerkUserId",
      type: "string",
      group: "details",
      description: "Clerk user ID for authentication",
    }),
    defineField({
      name: "paystackCustomerId",
      type: "string",
      group: "paystack",
      readOnly: true,
      description: "paystack customer ID for payments",
      validation: (rule) => [
        rule.required().error("paystack customer ID is required"),
      ],
    }),
    defineField({
      name: "createdAt",
      type: "datetime",
      group: "details",
      readOnly: true,
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      email: "email",
      name: "name",
      paystackCustomerId: "paystackCustomerId",
    },
    prepare({ email, name, paystackCustomerId }) {
      return {
        title: name ?? email ?? "Unknown Customer",
        subtitle: paystackCustomerId
          ? `${email ?? ""} • ${paystackCustomerId}`
          : (email ?? ""),
      };
    },
  },
  orderings: [
    {
      title: "Newest First",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
    {
      title: "Email A-Z",
      name: "emailAsc",
      by: [{ field: "email", direction: "asc" }],
    },
  ],
});