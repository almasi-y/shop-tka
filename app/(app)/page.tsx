import { Suspense } from "react";
import { sanityFetch } from "@/sanity/lib/live";
import {
  FEATURED_PRODUCTS_QUERY,
  FILTER_PRODUCTS_BY_NAME_QUERY,
  FILTER_PRODUCTS_BY_PRICE_ASC_QUERY,
  FILTER_PRODUCTS_BY_PRICE_DESC_QUERY,
  FILTER_PRODUCTS_BY_RELEVANCE_QUERY,
  PRODUCT_PRICE_FACET_QUERY,
} from "@/lib/sanity/queries/products";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import {
  ALL_BRANDS_QUERY,
  BRANDS_BY_SLUGS_QUERY,
} from "@/lib/sanity/queries/brands";
import { collectCategoryIds } from "@/lib/sanity/category-tree";
import { client } from "@/sanity/lib/client";
import { ProductSection } from "@/components/app/LandingPage/ProductSection";
import { CategoryTiles } from "@/components/app/LandingPage/CategoryTiles";
import { FeaturedCarousel } from "@/components/app/LandingPage/FeaturedCarousel";
import { FeaturedCarouselSkeleton } from "@/components/app/LandingPage/FeaturedCarouselSkeleton";
import type {
  ALL_CATEGORIES_QUERY_RESULT,
  ALL_BRANDS_QUERY_RESULT,
  FILTER_PRODUCTS_BY_NAME_QUERY_RESULT,
} from "@/sanity.types";

function createPriceBuckets(prices: Array<number | null>) {
  const validPrices = prices.filter(
    (price): price is number =>
      typeof price === "number" && Number.isFinite(price) && price >= 0,
  );
  if (validPrices.length === 0) return [];

  const min = Math.min(...validPrices);
  const max = Math.max(...validPrices);
  if (min === max) return [{ min, max }];

  const bucketCount = Math.min(4, Math.max(1, Math.ceil(max - min)));
  const width = (max - min) / bucketCount;
  const roundCurrency = (value: number) => Math.round(value * 100) / 100;

  return Array.from({ length: bucketCount }, (_, index) => ({
    min: index === 0 ? min : roundCurrency(min + width * index),
    max:
      index === bucketCount - 1
        ? max
        : roundCurrency(min + width * (index + 1)),
  }));
}

function parsePriceFilter(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export interface CatalogSearchParams {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  inStock?: string;
}

interface PageProps {
  categorySlugOverride?: string;
  searchParams: Promise<CatalogSearchParams>;
}

export async function CatalogPage({
  searchParams,
  categorySlugOverride,
}: PageProps) {
  const params = await searchParams;

  const searchQuery = params.q ?? "";
  const categorySlug = categorySlugOverride ?? params.category ?? "";
  const brandSlugs = (params.brand ?? "").split(",").filter(Boolean);
  const minPrice = parsePriceFilter(params.minPrice);
  const maxPrice = parsePriceFilter(params.maxPrice);
  const sort = params.sort ?? "name";
  const inStock = params.inStock === "true";

  // Select query based on sort parameter
  const getQuery = () => {
    // If searching and sort is relevance, use relevance query
    if (searchQuery && sort === "relevance") {
      return FILTER_PRODUCTS_BY_RELEVANCE_QUERY;
    }

    switch (sort) {
      case "price_asc":
        return FILTER_PRODUCTS_BY_PRICE_ASC_QUERY;
      case "price_desc":
        return FILTER_PRODUCTS_BY_PRICE_DESC_QUERY;
      case "relevance":
        return FILTER_PRODUCTS_BY_RELEVANCE_QUERY;
      default:
        return FILTER_PRODUCTS_BY_NAME_QUERY;
    }
  };

  // Fetch categories for filter sidebar
  const [categories, allBrands] = await Promise.all([
    client.fetch<ALL_CATEGORIES_QUERY_RESULT>(ALL_CATEGORIES_QUERY),
    client.fetch<ALL_BRANDS_QUERY_RESULT>(ALL_BRANDS_QUERY),
  ]);

  const selectedCategory = categories.find(
    (category) => category.slug === categorySlug,
  );
  const categoryIds = selectedCategory
    ? collectCategoryIds(categories, selectedCategory._id)
    : categorySlug
      ? ["__no_matching_category__"]
      : [];

  const selectedBrands = brandSlugs.length
    ? await client.fetch(BRANDS_BY_SLUGS_QUERY, { slugs: brandSlugs })
    : [];
  const brandIds = selectedBrands.map((brand) => brand._id);
  if (brandSlugs.length > 0 && brandIds.length === 0) {
    brandIds.push("__no_matching_brand__");
  }

  const sharedParams = { searchQuery, categoryIds, brandIds, inStock };
  const [filteredResult, featuredResult, priceResult] = await Promise.all([
    sanityFetch({
      query: getQuery(),
      params: { ...sharedParams, minPrice, maxPrice },
    }),
    sanityFetch({ query: FEATURED_PRODUCTS_QUERY }),
    sanityFetch({ query: PRODUCT_PRICE_FACET_QUERY, params: sharedParams }),
  ]);
  const filteredProducts = filteredResult.data;
  const featuredProducts = featuredResult.data;
  const priceBuckets = createPriceBuckets(priceResult.data);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Featured Products Carousel */}
      {featuredProducts.length > 0 && (
        <Suspense fallback={<FeaturedCarouselSkeleton />}>
          <FeaturedCarousel products={featuredProducts} />
        </Suspense>
      )}

      {/* Page Banner */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Shop {selectedCategory?.title ?? "All Products"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Robotics components, modules, tools, and educational kits
          </p>
        </div>

        {/* Category Tiles - Full width */}
        <div className="mt-6">
          <CategoryTiles
            categories={categories}
            activeCategory={categorySlug || undefined}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <ProductSection
            categories={categories}
            brands={allBrands}
            priceBuckets={priceBuckets}
            products={filteredProducts as FILTER_PRODUCTS_BY_NAME_QUERY_RESULT}
            searchQuery={searchQuery}
            categorySlug={categorySlug}
          />
      </div>
    </div>
  );
}

export default function HomePage({ searchParams }: PageProps) {
  return <CatalogPage searchParams={searchParams} />;
}
