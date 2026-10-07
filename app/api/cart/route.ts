import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  CART_BY_USER_QUERY,
  CART_DOCUMENT_BY_USER_QUERY,
  CART_PRODUCTS_QUERY,
} from "@/lib/sanity/queries/cart";
import { writeClient } from "@/sanity/lib/client";

const cartInputSchema = z.object({
  ownerUserId: z.string().trim().min(1).max(200),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .max(100),
});

function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET() {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return privateJson(
        { error: "Cart storage is not configured" },
        { status: 500 },
      );
    }
    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    const cart = await writeClient.fetch(CART_BY_USER_QUERY, {
      clerkUserId: userId,
    });
    const items = (cart?.items ?? []).flatMap((item) =>
      item?.productExists && item.productId && item.name && item.price != null
        ? [
            {
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity ?? 1,
            image: item.image ?? undefined,
            slug: item.slug ?? undefined,
            },
          ]
        : [],
    );

    return privateJson({ items });
  } catch (error) {
    console.error("Cart lookup failed", error);
    return privateJson({ error: "Unable to load cart" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return privateJson(
        { error: "Cart storage is not configured" },
        { status: 500 },
      );
    }
    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    const input = cartInputSchema.parse(await request.json());
    if (input.ownerUserId !== userId) {
      return privateJson(
        { error: "The active account changed before the cart was saved" },
        { status: 409 },
      );
    }
    const uniqueProductIds = [
      ...new Set(input.items.map((item) => item.productId)),
    ];
    if (uniqueProductIds.length !== input.items.length) {
      return privateJson(
        { error: "Duplicate products are not allowed" },
        { status: 400 },
      );
    }

    const products = uniqueProductIds.length
      ? await writeClient.fetch(CART_PRODUCTS_QUERY, {
          productIds: uniqueProductIds,
        })
      : [];
    const productsById = new Map(
      products.map((product) => [product._id, product]),
    );
    if (products.length !== uniqueProductIds.length) {
      return privateJson(
        { error: "One or more products no longer exist" },
        { status: 400 },
      );
    }

    const savedItems = input.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product?.name || product.price == null) {
        throw new Error("INVALID_CART_PRODUCT");
      }
      return {
        _key: crypto.randomUUID(),
        _type: "object" as const,
        product: { _type: "reference" as const, _ref: product._id },
        productName: product.name,
        priceAtSave: product.price,
        quantity: item.quantity,
        imageUrl: product.image ?? undefined,
        slug: product.slug ?? undefined,
      };
    });
    const now = new Date().toISOString();
    const existing = await writeClient.fetch(CART_DOCUMENT_BY_USER_QUERY, {
      clerkUserId: userId,
    });

    if (existing?._id) {
      await writeClient
        .patch(existing._id)
        .set({ items: savedItems, updatedAt: now })
        .commit();
    } else {
      await writeClient.create({
        _type: "shoppingCart",
        clerkUserId: userId,
        items: savedItems,
        updatedAt: now,
      });
    }

    return privateJson({ saved: true, updatedAt: now });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return privateJson(
        { error: error.issues[0]?.message ?? "Invalid cart" },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return privateJson({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Cart save failed", error);
    return privateJson({ error: "Unable to save cart" }, { status: 500 });
  }
}
