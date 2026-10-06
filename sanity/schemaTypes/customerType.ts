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
      description: "Paystack customer ID when one has been assigned.",
    }),
    defineField({
      name: "shippingAddress",
      title: "Default shipping address",
      type: "object",
      group: "details",
      fields: [
        defineField({
          name: "name",
          title: "Full name",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "line1",
          title: "Address line 1",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({ name: "line2", title: "Address line 2", type: "string" }),
        defineField({
          name: "city",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({ name: "postcode", title: "Postal code", type: "string" }),
        defineField({
          name: "county",
          type: "string",
          description: "Kenyan delivery county.",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "country",
          type: "string",
          initialValue: "Kenya",
          readOnly: true,
          validation: (rule) => rule.required(),
        }),
      ],
      description: "Address used to prefill this customer's checkout form.",
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
