import { tool } from "ai";
import { z } from "zod";
import { sanityFetch } from "@/sanity/lib/live";
import { client } from "@/sanity/lib/client";
import { AI_SEARCH_PRODUCTS_QUERY } from "@/lib/sanity/queries/products";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { ALL_BRANDS_QUERY } from "@/lib/sanity/queries/brands";
import { collectCategoryIds } from "@/lib/sanity/category-tree";
import { formatPrice } from "@/lib/utils";
import { getStockStatus, getStockMessage } from "@/lib/constants/stock";
import type {
  AI_SEARCH_PRODUCTS_QUERY_RESULT,
  ALL_BRANDS_QUERY_RESULT,
  ALL_CATEGORIES_QUERY_RESULT,
} from "@/sanity.types";
import type { SearchProduct } from "@/lib/ai/types";

const productSearchSchema = z.object({
  query: z
    .string()
    .max(200)
    .optional()
    .default("")
    .describe(
      "Search term for the product title or description, such as 'temperature probe' or 'Arduino-compatible'",
    ),
  category: z
    .string()
    .max(120)
    .optional()
    .default("")
    .describe(
      "Category title or slug from the store catalog. Leave empty when no category was requested.",
    ),
  brands: z
    .array(z.string().max(120))
    .max(20)
    .optional()
    .default([])
    .describe("Brand titles or slugs requested by the customer."),
  minPrice: z
    .number()
    .nonnegative()
    .optional()
    .default(0)
    .describe("Minimum price in KSh"),
  maxPrice: z
    .number()
    .nonnegative()
    .optional()
    .default(0)
    .describe("Maximum price in KSh. Use 0 for no maximum."),
});

const normalize = (value: string | null) => value?.trim().toLowerCase();

export const searchProductsTool = tool({
  description:
    "Search the Sanity catalog for robotics products by text, category, brand, or KES price range, including nested subcategories.",
  inputSchema: productSearchSchema,
  execute: async ({ query, category, brands, minPrice, maxPrice }) => {
    try {
      const [categories, availableBrands] = await Promise.all([
        client.fetch<ALL_CATEGORIES_QUERY_RESULT>(ALL_CATEGORIES_QUERY),
        client.fetch<ALL_BRANDS_QUERY_RESULT>(ALL_BRANDS_QUERY),
      ]);

      const requestedCategory = normalize(category);
      const selectedCategory = requestedCategory
        ? categories.find(
            (item) =>
              normalize(item.slug) === requestedCategory ||
              normalize(item.title) === requestedCategory,
          )
        : null;
      const categoryIds = selectedCategory
        ? collectCategoryIds(categories, selectedCategory._id)
        : requestedCategory
          ? ["__no_matching_category__"]
          : [];

      const requestedBrands = new Set(brands.map(normalize).filter(Boolean));
      const brandIds = availableBrands
        .filter(
          (brand) =>
            requestedBrands.has(normalize(brand.slug)) ||
            requestedBrands.has(normalize(brand.title)),
        )
        .map((brand) => brand._id);

      // An unknown requested filter must return no matches, not every product.
      if (requestedBrands.size > 0 && brandIds.length === 0) {
        brandIds.push("__no_matching_brand__");
      }

      const { data: products } = await sanityFetch({
        query: AI_SEARCH_PRODUCTS_QUERY,
        params: {
          searchQuery: query || "",
          categoryIds,
          brandIds,
          minPrice: minPrice || 0,
          maxPrice: maxPrice || 0,
          inStock: false,
        },
      });

      if (products.length === 0) {
        return {
          found: false,
          message:
            "No products found matching your criteria. Try different search terms or filters.",
          products: [],
          filters: { query, category, brands, minPrice, maxPrice },
        };
      }

      const formattedProducts: SearchProduct[] = (
        products as AI_SEARCH_PRODUCTS_QUERY_RESULT
      ).map((product) => ({
        id: product._id,
        name: product.name ?? null,
        slug: product.slug ?? null,
        description: product.description ?? null,
        features: (product.features ?? []).map((feature) => ({
          title: feature.title ?? null,
          description: feature.description ?? null,
        })),
        price: product.price ?? null,
        priceFormatted:
          product.price !== null ? formatPrice(product.price) : null,
        category: product.category?.title ?? null,
        categorySlug: product.category?.slug ?? null,
        brand: product.brand?.title ?? null,
        brandSlug: product.brand?.slug ?? null,
        color: product.color ?? null,
        size: product.size ?? null,
        dimensions: product.dimensions ?? null,
        stockCount: product.stock ?? 0,
        stockStatus: getStockStatus(product.stock),
        stockMessage: getStockMessage(product.stock),
        featured: product.featured ?? false,
        assemblyRequired: product.assemblyRequired ?? false,
        imageUrl: product.image?.asset?.url ?? null,
        productUrl: product.slug ? `/products/${product.slug}` : null,
      }));

      return {
        found: true,
        message: `Found ${products.length} product${products.length === 1 ? "" : "s"} matching your search.`,
        totalResults: products.length,
        products: formattedProducts,
        filters: { query, category, brands, minPrice, maxPrice },
      };
    } catch (error) {
      console.error("[SearchProducts] Error:", error);
      return {
        found: false,
        message: "An error occurred while searching for products.",
        products: [],
        error: error instanceof Error ? error.message : "Unknown error",
        filters: { query, category, brands, minPrice, maxPrice },
      };
    }
  },
});
