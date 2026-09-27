import { auth, currentUser } from "@clerk/nextjs/server";
import {
  ACTIVE_RESTOCK_SUBSCRIPTION_QUERY,
  RESTOCK_PRODUCT_QUERY,
} from "@/lib/sanity/queries/restock-subscriptions";
import { writeClient } from "@/sanity/lib/client";

function getProductId(request: Request) {
  return new URL(request.url).searchParams.get("productId")?.trim() ?? "";
}

async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const primaryEmail = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  );
  const email =
    primaryEmail?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  return email ? { userId, email } : null;
}

function isValidProductId(productId: string) {
  return productId.length > 0 && productId.length <= 200;
}

function hasWriteToken() {
  return Boolean(process.env.SANITY_API_WRITE_TOKEN);
}

export async function GET(request: Request) {
  try {
    if (!hasWriteToken()) {
      return Response.json(
        { error: "Restock notifications are not configured" },
        { status: 500 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const productId = getProductId(request);
    if (!isValidProductId(productId)) {
      return Response.json({ error: "Invalid product" }, { status: 400 });
    }

    const subscription = await writeClient.fetch(
      ACTIVE_RESTOCK_SUBSCRIPTION_QUERY,
      { clerkUserId: user.userId, productId },
    );

    return Response.json({ subscribed: Boolean(subscription) });
  } catch (error) {
    console.error("Restock subscription lookup failed", error);
    return Response.json(
      { error: "Unable to check notification status" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!hasWriteToken()) {
      return Response.json(
        { error: "Restock notifications are not configured" },
        { status: 500 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    let body: { productId?: unknown };
    try {
      body = (await request.json()) as { productId?: unknown };
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const productId =
      typeof body.productId === "string" ? body.productId.trim() : "";
    if (!isValidProductId(productId)) {
      return Response.json({ error: "Invalid product" }, { status: 400 });
    }

    const product = await writeClient.fetch(RESTOCK_PRODUCT_QUERY, {
      productId,
    });
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    if ((product.stock ?? 0) > 0) {
      return Response.json(
        {
          code: "IN_STOCK",
          error: `${product.name ?? "This product"} is back in stock`,
        },
        { status: 409 },
      );
    }

    const existing = await writeClient.fetch(
      ACTIVE_RESTOCK_SUBSCRIPTION_QUERY,
      { clerkUserId: user.userId, productId },
    );
    if (existing) {
      return Response.json({
        productName: product.name,
        status: "existing",
        subscribed: true,
      });
    }

    await writeClient.create({
      _type: "restockSubscription",
      product: { _type: "reference", _ref: productId },
      clerkUserId: user.userId,
      email: user.email,
      status: "pending",
      requestedAt: new Date().toISOString(),
    });

    return Response.json(
      {
        productName: product.name,
        status: "created",
        subscribed: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Restock subscription creation failed", error);
    return Response.json(
      { error: "Unable to register your notification" },
      { status: 500 },
    );
  }
}
