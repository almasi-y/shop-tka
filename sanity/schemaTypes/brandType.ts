import {TagIcon} from "@sanity/icons/Tag";
import {defineField, defineType} from "sanity";

export const brandType = defineType({
  name: "brand",
  title: "Brand",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => [
        rule.required().error("Brand title is required"),
        rule.max(80).warning("Keep brand names concise"),
      ],
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => [
        rule.required().error("Slug is required for brand filtering"),
      ],
    }),
    defineField({
      name: "logo",
      type: "image",
      options: {
        hotspot: true,
      },
      description: "Optional brand logo.",
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "logo",
    },
  },
});