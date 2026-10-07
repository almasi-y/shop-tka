import { auth } from "@clerk/nextjs/server";
import {
  WISHLIST_ITEM_QUERY,
  WISHLIST_COUNT_QUERY,
  WISHLIST_PRODUCT_QUERY,
} from "@/lib/sanity/queries/wishlist";
import { writeClient } from "@/sanity/lib/client";

function isValidProductId(productId: string) {
  return productId.length > 0 && productId.length <= 200;
}

function isConfigured() {
  return Boolean(process.env.SANITY_API_WRITE_TOKEN);
}

async function getWishlistItem(clerkUserId: string, productId: string) {
  return writeClient.fetch(WISHLIST_ITEM_QUERY, { clerkUserId, productId });
}

function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  try {
    if (!isConfigured()) {
      return privateJson(
        { error: "Wishlists are not configured" },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    if (!searchParams.has("productId")) {
      const count = await writeClient.fetch(WISHLIST_COUNT_QUERY, {
        clerkUserId: userId,
      });
      return privateJson({ count });
    }

    const productId = searchParams.get("productId")?.trim() ?? "";
    if (!isValidProductId(productId)) {
      return privateJson({ error: "Invalid product" }, { status: 400 });
    }

    const item = await getWishlistItem(userId, productId);
    return privateJson({ wishlisted: Boolean(item) });
  } catch (error) {
    console.error("Wishlist lookup failed", error);
    return privateJson({ error: "Unable to check wishlist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isConfigured()) {
      return privateJson(
        { error: "Wishlists are not configured" },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    let body: { productId?: unknown };
    try {
      body = (await request.json()) as { productId?: unknown };
    } catch {
      return privateJson({ error: "Invalid request" }, { status: 400 });
    }

    const productId =
      typeof body.productId === "string" ? body.productId.trim() : "";
    if (!isValidProductId(productId)) {
      return privateJson({ error: "Invalid product" }, { status: 400 });
    }

    const product = await writeClient.fetch(WISHLIST_PRODUCT_QUERY, {
      productId,
    });
    if (!product) {
      return privateJson({ error: "Product not found" }, { status: 404 });
    }

    const existing = await getWishlistItem(userId, productId);
    if (existing) {
      return privateJson({ wishlisted: true, status: "existing" });
    }

    await writeClient.create({
      _type: "wishlistItem",
      product: { _type: "reference", _ref: productId },
      clerkUserId: userId,
      createdAt: new Date().toISOString(),
    });

    return privateJson(
      { wishlisted: true, status: "created", productName: product.name },
      { status: 201 },
    );
  } catch (error) {
    console.error("Wishlist creation failed", error);
    return privateJson({ error: "Unable to save product" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isConfigured()) {
      return privateJson(
        { error: "Wishlists are not configured" },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    let body: { productId?: unknown };
    try {
      body = (await request.json()) as { productId?: unknown };
    } catch {
      return privateJson({ error: "Invalid request" }, { status: 400 });
    }

    const productId =
      typeof body.productId === "string" ? body.productId.trim() : "";
    if (!isValidProductId(productId)) {
      return privateJson({ error: "Invalid product" }, { status: 400 });
    }

    const item = await getWishlistItem(userId, productId);
    if (item?._id) {
      await writeClient.delete(item._id);
    }

    return privateJson({ wishlisted: false });
  } catch (error) {
    console.error("Wishlist removal failed", error);
    return privateJson({ error: "Unable to remove product" }, { status: 500 });
  }
}
