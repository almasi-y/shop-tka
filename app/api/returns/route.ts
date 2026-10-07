import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { returnRequestInputSchema } from "@/lib/returns/request-schema";
import {
  normalizeReturnOrderItems,
  returnDeadline,
} from "@/lib/returns/normalize";
import {
  ACTIVE_RETURN_ITEMS_BY_ORDER_QUERY,
  RETURN_ORDER_BY_ID_QUERY,
} from "@/lib/sanity/queries/returns";
import { writeClient } from "@/sanity/lib/client";

const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFECT_REASONS = new Set([
  "damaged",
  "faulty",
  "wrong_item",
  "not_as_described",
]);

function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: Request) {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return privateJson(
        { error: "Returns are not configured" },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    const formData = await request.formData();
    const rawPayload = formData.get("payload");
    if (typeof rawPayload !== "string") {
      return privateJson({ error: "Invalid return request" }, { status: 400 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return privateJson({ error: "Invalid return request" }, { status: 400 });
    }
    const input = returnRequestInputSchema.parse(payload);

    const evidenceFiles = formData
      .getAll("evidence")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (evidenceFiles.length > MAX_EVIDENCE_FILES) {
      return privateJson(
        { error: `Upload no more than ${MAX_EVIDENCE_FILES} photos` },
        { status: 400 },
      );
    }
    for (const file of evidenceFiles) {
      if (!EVIDENCE_TYPES.has(file.type) || file.size > MAX_EVIDENCE_BYTES) {
        return privateJson(
          { error: "Photos must be JPG, PNG, or WebP and no larger than 5 MB each" },
          { status: 400 },
        );
      }
    }
    if (
      (input.reason === "damaged" || input.reason === "faulty") &&
      evidenceFiles.length === 0
    ) {
      return privateJson(
        { error: "Add at least one photo for a damaged or faulty item" },
        { status: 400 },
      );
    }

    const order = await writeClient.fetch(RETURN_ORDER_BY_ID_QUERY, {
      orderId: input.orderId,
    });
    if (!order || order.clerkUserId !== userId) {
      return privateJson({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "delivered") {
      return privateJson(
        { error: "Returns can only be requested after delivery" },
        { status: 400 },
      );
    }
    if (!order.email) {
      return privateJson(
        { error: "This order has no customer email. Contact support." },
        { status: 400 },
      );
    }

    const purchasedItems = normalizeReturnOrderItems(order);
    const purchasedByProduct = new Map(
      purchasedItems.map((item) => [item.productId, item]),
    );
    const requestedProductIds = new Set<string>();
    for (const requested of input.items) {
      if (requestedProductIds.has(requested.productId)) {
        return privateJson(
          { error: "Each product can only appear once in a request" },
          { status: 400 },
        );
      }
      requestedProductIds.add(requested.productId);
    }

    const activeReturns = await writeClient.fetch(
      ACTIVE_RETURN_ITEMS_BY_ORDER_QUERY,
      { orderId: order._id },
    );
    const alreadyRequested = new Map<string, number>();
    for (const requestItem of activeReturns.flatMap(
      (returnRequest) => returnRequest.items ?? [],
    )) {
      if (!requestItem?.productId) continue;
      alreadyRequested.set(
        requestItem.productId,
        (alreadyRequested.get(requestItem.productId) ?? 0) +
          (requestItem.quantity ?? 0),
      );
    }

    const deliveryDate = order.deliveryDate
      ? new Date(order.deliveryDate)
      : null;
    if (!deliveryDate || Number.isNaN(deliveryDate.getTime())) {
      return privateJson(
        { error: "This order has no valid delivery date. Contact support." },
        { status: 400 },
      );
    }

    const requestItems = input.items.map((requested) => {
      const purchased = purchasedByProduct.get(requested.productId);
      if (!purchased) {
        throw new Error("RETURN_ITEM_NOT_PURCHASED");
      }
      const remaining =
        purchased.quantity - (alreadyRequested.get(requested.productId) ?? 0);
      if (requested.quantity > remaining) {
        throw new Error("RETURN_QUANTITY_EXCEEDED");
      }
      if (purchased.returnEligibility === "non_returnable") {
        throw new Error("RETURN_ITEM_INELIGIBLE");
      }
      if (
        purchased.returnEligibility === "defects_only" &&
        !DEFECT_REASONS.has(input.reason)
      ) {
        throw new Error("RETURN_REASON_INELIGIBLE");
      }
      if (new Date() > returnDeadline(order.deliveryDate, purchased.returnWindowDays)) {
        throw new Error("RETURN_WINDOW_CLOSED");
      }
      return {
        _key: crypto.randomUUID(),
        _type: "object" as const,
        product: { _type: "reference" as const, _ref: purchased.productId },
        productName: purchased.productName,
        quantity: requested.quantity,
        priceAtPurchase: purchased.priceAtPurchase,
      };
    });

    const evidenceImages = [];
    for (const file of evidenceFiles) {
      const asset = await writeClient.assets.upload("image", file, {
        filename: file.name,
      });
      evidenceImages.push({
        _key: crypto.randomUUID(),
        _type: "image" as const,
        asset: { _type: "reference" as const, _ref: asset._id },
      });
    }

    const requestNumber = `RET-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const created = await writeClient.create({
      _type: "returnRequest",
      requestNumber,
      order: { _type: "reference", _ref: order._id },
      clerkUserId: userId,
      customerEmail: order.email,
      resolution: input.resolution,
      reason: input.reason,
      notes: input.notes,
      packagingConfirmed: input.packagingConfirmed,
      evidenceImages,
      items: requestItems,
      status: "pending",
      requestedAt: new Date().toISOString(),
    });

    return privateJson(
      { requestId: created._id, requestNumber, status: "pending" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return privateJson(
        { error: error.issues[0]?.message ?? "Invalid return request" },
        { status: 400 },
      );
    }

    const knownErrors: Record<string, string> = {
      RETURN_ITEM_NOT_PURCHASED: "One of the selected products is not in this order",
      RETURN_QUANTITY_EXCEEDED: "The requested quantity is no longer available to return",
      RETURN_ITEM_INELIGIBLE: "One of the selected products is not returnable online",
      RETURN_REASON_INELIGIBLE: "That return reason is not eligible for this product",
      RETURN_WINDOW_CLOSED: "The return window has closed for one of the selected products",
    };
    if (error instanceof Error && knownErrors[error.message]) {
      return privateJson({ error: knownErrors[error.message] }, { status: 400 });
    }

    console.error("Return request creation failed", error);
    return privateJson(
      { error: "Unable to create the return request" },
      { status: 500 },
    );
  }
}
