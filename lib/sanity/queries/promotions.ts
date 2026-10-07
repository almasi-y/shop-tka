import { defineQuery } from "next-sanity";

export const ACTIVE_PROMOTIONS_QUERY = defineQuery(`*[
  _type == "promotion"
  && status == "active"
  && (!defined(startsAt) || dateTime(startsAt) <= dateTime(now()))
  && (!defined(endsAt) || dateTime(endsAt) >= dateTime(now()))
] | order(sortOrder asc, _createdAt desc) [0...6] {
  _id,
  internalTitle,
  mediaType,
  image {
    asset->{
      _id,
      url,
      metadata {
        lqip,
        dimensions { width, height }
      }
    },
    alt,
    hotspot,
    crop
  },
  youtubeUrl,
  muxVideo {
    asset->{
      playbackId,
      status,
      filename,
      data {
        aspect_ratio,
        duration
      }
    }
  },
  destinationUrl
}`);
