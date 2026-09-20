import { createAgentUIStreamResponse, safeValidateUIMessages } from "ai";
import { auth } from "@clerk/nextjs/server";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 100_000) {
    return Response.json({ error: "Chat request is too large" }, { status: 413 });
  }

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
  } catch {
    return Response.json({ error: "Invalid chat request" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length > 50) {
    return Response.json({ error: "Invalid chat messages" }, { status: 400 });
  }
  const validation = await safeValidateUIMessages({ messages: body.messages });
  if (!validation.success) {
    return Response.json({ error: "Invalid chat messages" }, { status: 400 });
  }
  const messages = validation.data;

  // Get the user's session - userId will be null if not authenticated
  const { userId } = await auth();

  // Create agent with user context (orders tool only available if authenticated)
  const agent = createShoppingAgent({ userId });

  return createAgentUIStreamResponse({ agent, uiMessages: messages });
}
