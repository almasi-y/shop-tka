import { defineQuery } from "next-sanity";

// ============================================
// Shared Query Fragments (DRY)
// ============================================

/** Common filter conditions for product filtering */
const PRODUCT_FILTER_CONDITIONS = `
  _type == "product"
  && (count($categoryIds) == 0 || category._ref in $categoryIds)
  && (count($brandIds) == 0 || brand._ref in $brandIds)
  && ($minPrice == 0 || price >= $minPrice)
  && ($maxPrice == 0 || price <= $maxPrice)
  && ($searchQuery == "" || coalesce(title, name) match $searchQuery + "*" || description match $searchQuery + "*" || features[].title match $searchQuery + "*" || features[].description match $searchQuery + "*" || aiKeywords[] match $searchQuery + "*" || aiTags[] match $searchQuery + "*")
  && ($inStock == false || stock > 0)
`;

/** Product filters used to calculate the price facet before price is applied. */
const PRODUCT_PRICE_FACET_CONDITIONS = `
  _type == "product"
  && (count($categoryIds) == 0 || category._ref in $categoryIds)
  && (count($brandIds) == 0 || brand._ref in $brandIds)
  && ($searchQuery == "" || coalesce(title, name) match $searchQuery + "*" || description match $searchQuery + "*" || features[].title match $searchQuery + "*" || features[].description match $searchQuery + "*" || aiKeywords[] match $searchQuery + "*" || aiTags[] match $searchQuery + "*")
  && ($inStock == false || stock > 0)
`;

/** Projection for filtered product lists (includes multiple images for hover) */
const FILTERED_PRODUCT_PROJECTION = `{
  _id,
  "name": coalesce(title, name),
  "slug": slug.current,
  price,
  "images": images[0...4]{
    _key,
    asset->{
      _id,
      url
    }
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  brand->{
    _id,
    title,
    "slug": slug.current
  },
  stock
}`;

/** Scoring for relevance-based search */
const RELEVANCE_SCORE = `score(
  boost(coalesce(title, name) match $searchQuery + "*", 3),
  boost(aiKeywords[] match $searchQuery + "*", 2),
  boost(aiTags[] match $searchQuery + "*", 2),
  boost(features[].title match $searchQuery + "*", 2),
  boost(features[].description match $searchQuery + "*", 1),
  boost(description match $searchQuery + "*", 1)
)`;

/**
 * Get featured products for homepage carousel
 */
export const FEATURED_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && stock > 0
  && featured == true
] | order(coalesce(title, name) asc) [0...6] {
  _id,
  "name": coalesce(title, name),
  "slug": slug.current,
  description,
  price,
  "images": images[]{
    _key,
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  brand->{
    _id,
    title,
    "slug": slug.current
  },
  stock
}`);

/**
 * Get single product by slug
 * Used on product detail page
 */
export const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[
  _type == "product"
  && (slug.current == $identifier || _id == $identifier)
][0] {
  _id,
  "name": coalesce(title, name),
  "slug": slug.current,
  description,
  features[]{_key, title, description},
  price,
  "images": images[]{
    _key,
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  brand->{
    _id,
    title,
    "slug": slug.current
  },
  color,
  size,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);

// ============================================
// Search & Filter Queries (Server-Side)
// Uses GROQ score() for relevance ranking
// ============================================

/**
 * Filter products - ordered by name (A-Z)
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_NAME_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(coalesce(title, name) asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by price ascending
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_PRICE_ASC_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(price asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by price descending
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_PRICE_DESC_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(price desc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by relevance (when searching)
 * Uses score() for search term matching
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_RELEVANCE_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | ${RELEVANCE_SCORE} | order(_score desc, coalesce(title, name) asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/** Prices for dynamically calculating category-specific filter buckets. */
export const PRODUCT_PRICE_FACET_QUERY = defineQuery(`*[
  ${PRODUCT_PRICE_FACET_CONDITIONS}
  && defined(price)
].price`);

/**
 * Get products by IDs (for cart/checkout)
 */
export const PRODUCTS_BY_IDS_QUERY = defineQuery(`*[
  _type == "product"
  && _id in $ids
] {
  _id,
  "name": coalesce(title, name),
  "slug": slug.current,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    },
    hotspot
  },
  stock
}`);

// ============================================
// AI Shopping Assistant Query
// Uses score() + boost() with all filters for AI agent
// ============================================

/**
 * Search products for AI shopping assistant
 * Full-featured search with all filters and product details
 */
export const AI_SEARCH_PRODUCTS_QUERY = defineQuery(`*[
  ${PRODUCT_FILTER_CONDITIONS}
] | ${RELEVANCE_SCORE} | order(_score desc, coalesce(title, name) asc) [0...20] {
  _id,
  "name": coalesce(title, name),
  "slug": slug.current,
  description,
  features[]{_key, title, description},
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    }
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  brand->{
    _id,
    title,
    "slug": slug.current
  },
  color,
  size,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);
