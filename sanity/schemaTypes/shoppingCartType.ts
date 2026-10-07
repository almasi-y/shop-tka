import { BasketIcon } from "@sanity/icons/Basket";
import { defineArrayMember, defineField, defineType } from "sanity";

export const shoppingCartType = defineType({
  name: "shoppingCart",
  title: "Shopping Cart",
  type: "document",
  icon: BasketIcon,
  fields: [
    defineField({
      name: "clerkUserId",
      title: "Clerk user ID",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "items",
      type: "array",
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
              description: "Name snapshot captured when the cart was saved.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "priceAtSave",
              type: "number",
              description: "Price snapshot only; checkout revalidates current prices.",
              validation: (rule) => rule.required().min(0),
            }),
            defineField({
              name: "quantity",
              type: "number",
              validation: (rule) => rule.required().integer().min(1).max(1000),
            }),
            defineField({ name: "imageUrl", type: "url" }),
            defineField({ name: "slug", type: "string" }),
          ],
          preview: {
            select: {
              title: "productName",
              quantity: "quantity",
              price: "priceAtSave",
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
        subtitle: updatedAt ? `Updated ${new Date(updatedAt).toLocaleString()}` : "Saved cart",
      };
    },
  },
});

