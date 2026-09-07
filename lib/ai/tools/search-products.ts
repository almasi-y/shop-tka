// lib/ai/tools/search-products.ts
export const searchProductsTool = tool({
  description: "Search for products in the furniture store",
  inputSchema: z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    material: z.enum(["", "wood", "metal", "fabric", "leather", "glass"]),
    color: z.enum(["", "black", "white", "oak", "walnut", "grey", "natural"]),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
  }),
  execute: async (params) => {
    // Executes GROQ query against Sanity
    const { data: products } = await sanityFetch({
      query: AI_SEARCH_PRODUCTS_QUERY,
      params,
    });
    return { products, found: products.length > 0 };
  },
});