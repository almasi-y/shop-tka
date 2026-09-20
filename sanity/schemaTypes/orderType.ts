import { BasketIcon } from "@sanity/icons/Basket";
import { defineArrayMember, defineField, defineType } from "sanity";

const ORDER_STATUS_SANITY_LIST = [
  { title: "Paid", value: "paid" },
  { title: "Shipped", value: "shipped" },
  { title: "Delivered", value: "delivered" },
  { title: "Cancelled", value: "cancelled" },
];

export const orderType = defineType({
  name: "order",
  title: "Order",
  type: "document",
  icon: BasketIcon,
  groups: [
    { name: "details", title: "Order Details", default: true },
    { name: "customer", title: "Customer" },
    { name: "payment", title: "Payment" },
  ],
  fields: [
    defineField({
      name: "orderNumber",
      type: "string",
      group: "details",
      readOnly: true,
      validation: (rule) => [rule.required().error("Order number is required")],
    }),
    defineField({
      name: "items",
      title: "Order items (deprecated)",
      type: "array",
      group: "details",
      deprecated: {
        reason: 'Use the canonical "products" and "quantities" fields instead.',
      },
      readOnly: true,
      hidden: ({ value }) => value === undefined,
      initialValue: undefined,
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
              name: "quantity",
              type: "number",
              initialValue: 1,
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: "priceAtPurchase",
              type: "number",
              description: "Price at time of purchase",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {
              title: "product.name",
              quantity: "quantity",
              price: "priceAtPurchase",
              media: "product.images.0",
            },
            prepare({ title, quantity, price, media }) {
              return {
                title: title ?? "Product",
                subtitle: `Qty: ${quantity} • KSh ${price}`,
                media,
              };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "total",
      title: "Order total (deprecated)",
      type: "number",
      group: "details",
      readOnly: true,
      deprecated: {
        reason: 'Use the canonical "totalPrice" field instead.',
      },
      hidden: ({ value }) => value === undefined,
      initialValue: undefined,
    }),
    defineField({
      name: "totalPrice",
      type: "number",
      group: "details",
      readOnly: true,
      description: "Canonical order total in KES.",
      validation: (rule) => [
        rule.required().error("Order total is required"),
        rule.min(0).error("Order total cannot be negative"),
      ],
    }),
    defineField({
      name: "products",
      type: "array",
      group: "details",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "product" }],
        }),
      ],
      description: "Products purchased in this order.",
      validation: (rule) => [
        rule.required().min(1).error("At least one product is required"),
      ],
    }),
    defineField({
      name: "quantities",
      type: "array",
      group: "details",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "number",
          validation: (rule) => rule.required().integer().min(1),
        }),
      ],
      description: "Quantities corresponding to the products array.",
      validation: (rule) => [
        rule.required().min(1).error("At least one quantity is required"),
        rule.custom((quantities, context) => {
          const products = context.document?.products;
          return Array.isArray(products) &&
            Array.isArray(quantities) &&
            products.length !== quantities.length
            ? "Quantities must correspond to every product"
            : true;
        }),
      ],
    }),
    defineField({
      name: "productPrices",
      title: "Prices at purchase",
      type: "array",
      group: "details",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "number",
          validation: (rule) => rule.min(0),
        }),
      ],
      description:
        "Unit prices captured at payment initialization, corresponding to the products array.",
      validation: (rule) => [
        rule.required().min(1).error("At least one product price is required"),
        rule.custom((prices, context) => {
          const products = context.document?.products;
          return Array.isArray(products) &&
            Array.isArray(prices) &&
            products.length !== prices.length
            ? "Prices must correspond to every product"
            : true;
        }),
      ],
    }),
    defineField({
      name: "status",
      type: "string",
      group: "details",
      initialValue: "paid",
      options: {
        list: ORDER_STATUS_SANITY_LIST,
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "customer",
      type: "reference",
      to: [{ type: "customer" }],
      group: "customer",
      description: "Reference to the customer record",
    }),
    defineField({
      name: "clerkUserId",
      type: "string",
      group: "customer",
      readOnly: true,
      description: "Clerk user ID",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "email",
      title: "Customer email (deprecated)",
      type: "string",
      group: "customer",
      readOnly: true,
      deprecated: {
        reason: 'Use the canonical "customerEmail" field instead.',
      },
      hidden: ({ value }) => value === undefined,
      initialValue: undefined,
    }),
    defineField({
      name: "customerEmail",
      type: "string",
      group: "customer",
      readOnly: true,
      validation: (rule) => [
        rule.required().error("Customer email is required"),
        rule.email().error("Enter a valid customer email"),
      ],
    }),
    defineField({
      name: "address",
      title: "Shipping address (deprecated)",
      type: "object",
      group: "customer",
      deprecated: {
        reason: 'Use the canonical "shippingAddress" field instead.',
      },
      readOnly: true,
      hidden: ({ value }) => value === undefined,
      initialValue: undefined,
      fields: [
        defineField({ name: "name", type: "string", title: "Full Name" }),
        defineField({ name: "line1", type: "string", title: "Address Line 1" }),
        defineField({ name: "line2", type: "string", title: "Address Line 2" }),
        defineField({ name: "city", type: "string" }),
        defineField({ name: "postcode", type: "string", title: "Postcode" }),
        defineField({ name: "country", type: "string" }),
      ],
    }),
    defineField({
      name: "shippingAddress",
      type: "object",
      group: "customer",
      fields: [
        defineField({
          name: "name",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "line1",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({ name: "line2", type: "string" }),
        defineField({
          name: "city",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({ name: "postcode", type: "string" }),
        defineField({
          name: "country",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      description: "Shipping address captured at checkout.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "paystackPaymentId",
      title: "Paystack payment ID (deprecated)",
      type: "string",
      group: "payment",
      readOnly: true,
      deprecated: {
        reason: 'Use the canonical "paystackReference" field instead.',
      },
      hidden: ({ value }) => value === undefined,
      initialValue: undefined,
    }),
    defineField({
      name: "paystackReference",
      type: "string",
      group: "payment",
      readOnly: true,
      description: "Paystack transaction reference used for verification.",
      validation: (rule) => [
        rule.required().error("Paystack reference is required"),
      ],
    }),
    defineField({
      name: "inventoryAdjusted",
      title: "Inventory adjusted",
      type: "boolean",
      group: "payment",
      readOnly: true,
      description:
        "Whether this paid order was safely deducted from product inventory.",
    }),
    defineField({
      name: "inventoryIssue",
      title: "Inventory reconciliation note",
      type: "string",
      group: "payment",
      readOnly: true,
      hidden: ({ parent }) => parent?.inventoryAdjusted !== false,
      description:
        "Explains why a paid order needs manual inventory reconciliation.",
    }),
    defineField({
      name: "createdAt",
      type: "datetime",
      group: "details",
      readOnly: true,
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      orderNumber: "orderNumber",
      customerEmail: "customerEmail",
      legacyEmail: "email",
      totalPrice: "totalPrice",
      legacyTotal: "total",
      status: "status",
    },
    prepare({
      orderNumber,
      customerEmail,
      legacyEmail,
      totalPrice,
      legacyTotal,
      status,
    }) {
      const email = customerEmail ?? legacyEmail;
      const total = totalPrice ?? legacyTotal;
      return {
        title: `Order ${orderNumber ?? "N/A"}`,
        subtitle: `${email ?? "No email"} • KSh ${total ?? 0} • ${status ?? "paid"}`,
      };
    },
  },
  orderings: [
    {
      title: "Newest First",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
  ],
});
