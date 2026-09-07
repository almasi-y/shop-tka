// lib/ai/tools/get-my-orders.ts
export function createGetMyOrdersTool(userId: string | null) {
  if (!userId) return null; // Not available for guests

  return tool({
    description: "Get the current user's orders",
    inputSchema: z.object({
      status: z.enum(["", "pending", "paid", "shipped", "delivered"]).optional(),
    }),
    execute: async ({ status }) => {
      const { data: orders } = await sanityFetch({
        query: ORDERS_BY_USER_QUERY,
        params: { clerkUserId: userId },
      });
      return { orders, found: orders.length > 0 };
    },
  });
}