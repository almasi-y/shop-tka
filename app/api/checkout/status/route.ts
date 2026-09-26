import { auth } from "@clerk/nextjs/server";
import { serverReadClient } from "@/sanity/lib/server-client";
import { ORDER_STATUS_BY_PAYSTACK_REFERENCE_QUERY } from "@/lib/sanity/queries/orders";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  if (!reference || reference.length > 160) {
    return Response.json({ error: "Invalid payment reference" }, { status: 400 });
  }

  const order = await serverReadClient.fetch(
    ORDER_STATUS_BY_PAYSTACK_REFERENCE_QUERY,
    { paystackReference: reference },
  );

  if (!order) {
    return Response.json({ confirmed: false });
  }
  if (order.clerkUserId !== userId) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  return Response.json({
    confirmed: true,
    orderId: order._id,
    status: order.status,
  });
}
