import { TagIcon } from "@sanity/icons/Tag";
import { defineField, defineType } from "sanity";
import { apiVersion } from "../env";

function normalizeDocumentId(documentId: string) {
  return documentId.replace(/^drafts\./, "");
}

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => [
        rule.required().error("Category title is required"),
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
        rule.required().error("Slug is required for URL generation"),
      ],
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description: "Short description used for category context and search.",
    }),
    defineField({
      name: "icon",
      type: "string",
      description: "Optional icon identifier for category navigation.",
    }),
    defineField({
      name: "parentCategory",
      title: "Parent category",
      type: "reference",
      to: [{ type: "category" }],
      description: "Leave empty for a top-level category.",
      validation: (rule) =>
        rule.custom(async (parent, context) => {
          const reference = parent as { _ref?: string } | undefined;
          const rawDocumentId = context.document?._id;
          if (!reference?._ref || !rawDocumentId) return true;

          const documentId = normalizeDocumentId(rawDocumentId);
          let parentId: string | null = normalizeDocumentId(reference._ref);
          if (parentId === documentId) {
            return "A category cannot be its own parent";
          }

          const relationships = await context
            .getClient({ apiVersion })
            .fetch<Array<{ _id: string; parentId: string | null }>>(
              `*[_type == "category"]{_id, "parentId": parentCategory._ref}`,
              {},
              { perspective: "drafts" },
            );
          const parentById = new Map(
            relationships.map((category) => [
              normalizeDocumentId(category._id),
              category.parentId
                ? normalizeDocumentId(category.parentId)
                : null,
            ]),
          );
          const visited = new Set<string>();

          while (parentId && !visited.has(parentId)) {
            if (parentId === documentId) {
              return "This parent would create a category cycle";
            }
            visited.add(parentId);
            parentId = parentById.get(parentId) ?? null;
          }

          return true;
        }),
    }),
    defineField({
      name: "image",
      type: "image",
      options: {
        hotspot: true,
      },
      description: "Category thumbnail image",
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "image",
    },
  },
});
