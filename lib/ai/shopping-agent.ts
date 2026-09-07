// lib/ai/shopping-agent.ts
export function createShoppingAgent({ userId }: { userId: string | null }) {
  const isAuthenticated = !!userId;

  // Tools vary based on authentication
  const tools: Record<string, Tool> = {
    searchProducts: searchProductsTool, // Always available
  };

  // Only add orders tool if user is signed in
  if (isAuthenticated) {
    tools.getMyOrders = createGetMyOrdersTool(userId);
  }

  return new ToolLoopAgent({
    model: gateway("anthropic/claude-sonnet-4.5"),
    instructions: isAuthenticated ? fullInstructions : guestInstructions,
    tools,
  });
}