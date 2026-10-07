import { ImageIcon } from "@sanity/icons/Image";
import { defineField, defineType } from "sanity";

type PromotionParent = {
  mediaType?: "image" | "youtube" | "mux";
  startsAt?: string;
};

function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");
    return (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    );
  } catch {
    return false;
  }
}

function isDestination(value: string) {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const promotionType = defineType({
  name: "promotion",
  title: "Promotion",
  type: "document",
  icon: ImageIcon,
  fields: [
    defineField({
      name: "internalTitle",
      title: "Internal title",
      type: "string",
      description:
        "Used in Studio and as the accessible title for this promotion.",
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "active",
      options: {
        layout: "radio",
        list: [
          { title: "Active", value: "active" },
          { title: "Inactive", value: "inactive" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "mediaType",
      title: "Media type",
      type: "string",
      initialValue: "image",
      options: {
        layout: "radio",
        list: [
          { title: "Image", value: "image" },
          { title: "YouTube video", value: "youtube" },
          { title: "Uploaded video (Mux)", value: "mux" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "image",
      type: "image",
      options: { hotspot: true },
      hidden: ({ parent }) =>
        (parent as PromotionParent | undefined)?.mediaType !== "image",
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          description:
            "Describe the promotion for customers using screen readers.",
          validation: (rule) =>
            rule
              .required()
              .warning("Alternative text improves accessibility and SEO."),
        }),
      ],
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as PromotionParent | undefined;
          return parent?.mediaType !== "image" || value?.asset
            ? true
            : "An image is required for image promotions";
        }),
    }),
    defineField({
      name: "youtubeUrl",
      title: "YouTube URL",
      type: "url",
      hidden: ({ parent }) =>
        (parent as PromotionParent | undefined)?.mediaType !== "youtube",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as PromotionParent | undefined;
          if (parent?.mediaType !== "youtube") return true;
          if (!value) return "A YouTube URL is required for video promotions";
          return isYouTubeUrl(value) || "Enter a valid YouTube URL";
        }),
    }),
    defineField({
      name: "muxVideo",
      title: "Uploaded video",
      type: "mux.video",
      description:
        "Upload a promotional video or select an existing video from your Mux library.",
      hidden: ({ parent }) =>
        (parent as PromotionParent | undefined)?.mediaType !== "mux",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as PromotionParent | undefined;
          const hasAsset =
            typeof value === "object" &&
            value !== null &&
            "asset" in value &&
            Boolean(value.asset);

          return parent?.mediaType !== "mux" || hasAsset
            ? true
            : "A Mux video is required for uploaded video promotions";
        }),
    }),
    defineField({
      name: "destinationUrl",
      title: "Destination URL",
      type: "string",
      description:
        "Optional internal path or full URL opened when an image promotion is selected.",
      validation: (rule) =>
        rule.custom(
          (value) =>
            !value ||
            isDestination(value) ||
            "Enter an internal path or a full http(s) URL",
        ),
    }),
    defineField({
      name: "sortOrder",
      title: "Display order",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: "startsAt",
      title: "Starts at",
      type: "datetime",
      description: "Optional. Leave empty to show immediately when active.",
    }),
    defineField({
      name: "endsAt",
      title: "Ends at",
      type: "datetime",
      description:
        "Optional. Leave empty to keep showing until manually deactivated.",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as PromotionParent | undefined;
          if (!value || !parent?.startsAt) return true;
          return new Date(value) > new Date(parent.startsAt)
            ? true
            : "The end time must be after the start time";
        }),
    }),
  ],
  preview: {
    select: {
      title: "internalTitle",
      status: "status",
      mediaType: "mediaType",
      media: "image",
    },
    prepare({ title, status, mediaType, media }) {
      const mediaLabel =
        mediaType === "youtube"
          ? "YouTube"
          : mediaType === "mux"
            ? "Mux video"
            : "Image";

      return {
        title,
        subtitle: `${status === "active" ? "Active" : "Inactive"} · ${mediaLabel}`,
        media,
      };
    },
  },
});
