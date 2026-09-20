import { PackageIcon } from "@sanity/icons/Package";
import { CheckmarkCircleIcon } from "@sanity/icons/CheckmarkCircle";
import { defineArrayMember, defineField, defineType } from "sanity";

export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  icon: PackageIcon,
  groups: [
    { name: "details", title: "Details", default: true },
    { name: "media", title: "Media" },
    { name: "inventory", title: "Inventory" },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Product name (deprecated)",
      type: "string",
      group: "details",
      deprecated: {
        reason: 'Use the canonical "title" field instead.',
      },
      readOnly: true,
      hidden: ({ value }) => value === undefined,
      initialValue: undefined,
    }),
    defineField({
      name: "title",
      type: "string",
      group: "details",
      description: "Canonical product title for the robotics catalog.",
      validation: (rule) => [
        rule.required().error("Product title is required"),
        rule.max(160).warning("Keep product titles concise"),
      ],
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "details",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => [
        rule.required().error("Slug is required for URL generation"),
      ],
    }),
    defineField({
      name: "description",
      type: "text",
      group: "details",
      rows: 8,
      description: "Product description",
    }),
    defineField({
      name: "features",
      title: "Product features",
      type: "array",
      group: "details",
      description:
        "Add titled features with detailed descriptions for the product page.",
      of: [
        defineArrayMember({
          name: "productFeature",
          title: "Product feature",
          type: "object",
          icon: CheckmarkCircleIcon,
          fields: [
            defineField({
              name: "title",
              type: "string",
              validation: (rule) => rule.required().max(120),
            }),
            defineField({
              name: "description",
              type: "text",
              rows: 4,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: "title", subtitle: "description" },
          },
        }),
      ],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: "price",
      type: "number",
      group: "details",
      description: "Price in Ksh",
      validation: (rule) => [
        rule.required().error("Price is required"),
        rule.positive().error("Price must be a positive number"),
      ],
    }),
    defineField({
      name: "category",
      type: "reference",
      to: [{ type: "category" }],
      group: "details",
      validation: (rule) => [rule.required().error("Category is required")],
    }),
    defineField({
      name: "brand",
      type: "reference",
      to: [{ type: "brand" }],
      group: "details",
      description: "Brand associated with this product.",
    }),
    defineField({
      name: "size",
      type: "string",
      group: "details",
      description: "Optional product size or variant label.",
    }),
    defineField({
      name: "material",
      type: "string",
      group: "details",
      description: "Optional product material.",
    }),
    defineField({
      name: "color",
      type: "string",
      group: "details",
      description: "Optional product color or finish.",
    }),
    defineField({
      name: "aiKeywords",
      type: "array",
      group: "details",
      of: [defineArrayMember({ type: "string" })],
      description: "Search terms used by the product assistant.",
      validation: (rule) => [rule.unique()],
    }),
    defineField({
      name: "aiTags",
      type: "array",
      group: "details",
      of: [defineArrayMember({ type: "string" })],
      description: "Structured tags used by the product assistant.",
      validation: (rule) => [rule.unique()],
    }),
    defineField({
      name: "dimensions",
      type: "string",
      group: "details",
      description: 'e.g., "120cm x 80cm x 75cm"',
    }),
    defineField({
      name: "images",
      type: "array",
      group: "media",
      of: [
        defineArrayMember({
          type: "image",
          options: {
            hotspot: true,
          },
        }),
      ],
      validation: (rule) => [
        rule.required().error("At least one image is required"),
        rule.min(1).error("At least one image is required"),
      ],
    }),
    defineField({
      name: "stock",
      type: "number",
      group: "inventory",
      initialValue: 0,
      description: "Number of items in stock",
      validation: (rule) => [
        rule.required().error("Stock is required"),
        rule.min(0).error("Stock cannot be negative"),
        rule.integer().error("Stock must be a whole number"),
      ],
    }),
    defineField({
      name: "featured",
      type: "boolean",
      group: "inventory",
      initialValue: false,
      description: "Show on homepage and promotions",
    }),
    defineField({
      name: "assemblyRequired",
      type: "boolean",
      group: "inventory",
      initialValue: false,
      description: "Does this product require assembly?",
    }),
  ],
  preview: {
    select: {
      title: "title",
      legacyTitle: "name",
      subtitle: "category.title",
      media: "images.0",
      price: "price",
    },
    prepare({ title, legacyTitle, subtitle, media, price }) {
      return {
        title: title ?? legacyTitle ?? "Untitled product",
        subtitle: `${subtitle ? subtitle + " • " : ""}KSh ${price ?? 0}`,
        media,
      };
    },
  },
});
