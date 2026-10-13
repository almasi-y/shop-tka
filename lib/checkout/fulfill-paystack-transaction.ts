import crypto from "node:crypto";
import { writeClient } from "@/sanity/lib/client";
import { ORDER_BY_PAYSTACK_REFERENCE_QUERY } from "@/lib/sanity/queries/orders";
import { shippingAddressSchema } from "@/lib/checkout/shipping-address";
import {
  createTrackingEventKey,
  createTrackingNumber,
} from "@/lib/orders/tracking";
import { logPaymentEvent } from "@/lib/payments/observability";

export type PaystackTransaction = {
  id?: number;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  email?: string;
  paid_at?: string | null;
  customer?: {
    email?: string;
    customer_code?: string;
  };
  metadata?: {
    clerkUserId?: string;
    productIds?: string[];
    quantities?: number[];
    productPrices?: number[];
    shippingFee?: number;
    shippingAddress?: unknown;
  };
};

type InventoryProduct = {
  _id: string;
  _rev: string;
  stock: number | null;
};

type FulfillmentResult = {
  orderId: string;
  duplicate: boolean;
};

const MAX_INVENTORY_ATTEMPTS = 3;

export class PaystackFulfillmentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "PaystackFulfillmentError";
  }
}

export async function fulfillPaystackTransaction(
  transaction: PaystackTransaction,
  expectedClerkUserId?: string,
): Promise<FulfillmentResult> {
  if (!process.env.SANITY_API_WRITE_TOKEN) {
    throw new PaystackFulfillmentError(
      "Sanity writes are not configured",
      500,
      "SANITY_WRITE_TOKEN_MISSING",
    );
  }

  const reference = transaction.reference;
  const metadata = transaction.metadata;
  const productIds = metadata?.productIds;
  const quantities = metadata?.quantities;
  const productPrices = metadata?.productPrices;
  const shippingFee = metadata?.shippingFee;
  const parsedAddress = shippingAddressSchema.safeParse(
    metadata?.shippingAddress,
  );

  if (
    !reference ||
    !metadata?.clerkUserId ||
    !productIds?.length ||
    !quantities ||
    !productPrices ||
    typeof shippingFee !== "number" ||
    !Number.isSafeInteger(shippingFee) ||
    shippingFee < 0 ||
    !parsedAddress.success ||
    productIds.length !== quantities.length ||
    productIds.length !== productPrices.length ||
    productIds.some((productId) => typeof productId !== "string" || !productId) ||
    quantities.some(
      (quantity) => !Number.isSafeInteger(quantity) || quantity < 1,
    ) ||
    productPrices.some(
      (price) =>
        typeof price !== "number" || !Number.isFinite(price) || price <= 0,
    ) ||
    new Set(productIds).size !== productIds.length
  ) {
    throw new PaystackFulfillmentError(
      "Incomplete Paystack metadata",
      400,
      "PAYSTACK_METADATA_INVALID",
    );
  }

  if (
    expectedClerkUserId &&
    metadata.clerkUserId !== expectedClerkUserId
  ) {
    throw new PaystackFulfillmentError(
      "Order not found",
      404,
      "PAYSTACK_OWNER_MISMATCH",
    );
  }

  const existingOrder = await writeClient.fetch(
    ORDER_BY_PAYSTACK_REFERENCE_QUERY,
    { paystackReference: reference },
  );

  if (existingOrder) {
    return { orderId: existingOrder._id, duplicate: true };
  }

  const subtotal = quantities.reduce(
    (sum, quantity, index) => sum + productPrices[index] * quantity,
    0,
  );
  const total = subtotal + shippingFee;

  if (
    transaction.status !== "success" ||
    transaction.currency?.toUpperCase() !== "KES" ||
    transaction.amount !== Math.round(total * 100)
  ) {
    throw new PaystackFulfillmentError(
      "Paystack payment validation failed",
      400,
      "PAYSTACK_PAYMENT_VALIDATION_FAILED",
    );
  }

  const referenceHash = crypto
    .createHash("sha256")
    .update(reference)
    .digest("hex");
  const createdAt = transaction.paid_at
    ? new Date(transaction.paid_at).toISOString()
    : new Date().toISOString();
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${referenceHash.slice(0, 6).toUpperCase()}`;
  const orderId = `order.paystack.${referenceHash}`;
  const trackingNumber = createTrackingNumber(reference, createdAt);
  const customerEmail = transaction.customer?.email ?? transaction.email;

  if (!customerEmail) {
    throw new PaystackFulfillmentError(
      "Paystack customer email is missing",
      400,
      "PAYSTACK_CUSTOMER_EMAIL_MISSING",
    );
  }

  const orderDocument = {
    _id: orderId,
    _type: "order",
    orderNumber,
    clerkUserId: metadata.clerkUserId,
    customerEmail,
    shippingAddress: parsedAddress.data,
    products: productIds.map((_ref, index) => ({
      _key: crypto
        .createHash("sha1")
        .update(`${reference}:${index}:${_ref}`)
        .digest("hex")
        .slice(0, 16),
      _type: "reference",
      _ref,
    })),
    quantities,
    productPrices,
    subtotal,
    shippingFee,
    totalPrice: total,
    status: "paid",
    paymentStatus: "paid",
    fulfillmentStatus: "processing",
    trackingNumber,
    trackingEvents: [
      {
        _key: createTrackingEventKey(
          reference,
          "payment_confirmed",
          createdAt,
        ),
        _type: "trackingEvent",
        status: "payment_confirmed",
        occurredAt: createdAt,
        publicMessage: "Payment confirmed and order received.",
        source: "system",
      },
      {
        _key: createTrackingEventKey(reference, "processing", createdAt),
        _type: "trackingEvent",
        status: "processing",
        occurredAt: createdAt,
        publicMessage: "Your order is being prepared.",
        source: "system",
      },
    ],
    paystackReference: reference,
    createdAt,
  };

  for (let attempt = 0; attempt < MAX_INVENTORY_ATTEMPTS; attempt += 1) {
    const products = await writeClient.fetch<InventoryProduct[]>(
      `*[_type == "product" && _id in $ids]{_id, _rev, stock}`,
      { ids: productIds },
    );
    const productById = new Map(
      products.map((product) => [product._id, product]),
    );
    const inventoryIssue = productIds
      .map((productId, index) => {
        const product = productById.get(productId);
        if (!product) return `Product ${productId} no longer exists`;
        if ((product.stock ?? 0) < quantities[index]) {
          return `Product ${productId} has insufficient stock`;
        }
        return null;
      })
      .find((issue): issue is string => issue !== null);

    // Payment has already completed. Retain the paid order even if stock now
    // needs manual reconciliation.
    if (inventoryIssue) {
      const createdOrder = await writeClient.createIfNotExists({
        ...orderDocument,
        inventoryAdjusted: false,
        inventoryIssue,
      });
      logPaymentEvent("error", "payment.inventory_reconciliation.required", {
        orderId,
        reference,
        inventoryIssue,
      });
      return { orderId: createdOrder._id, duplicate: false };
    }

    try {
      const transactionBuilder = productIds.reduce(
        (transactionBuilder, productId, index) => {
          const product = productById.get(productId)!;
          return transactionBuilder.patch(productId, (patch) =>
            patch
              .ifRevisionId(product._rev)
              .dec({ stock: quantities[index] }),
          );
        },
        writeClient.transaction().create({
          ...orderDocument,
          inventoryAdjusted: true,
        }),
      );
      const commitResult = await transactionBuilder.commit();
      return {
        orderId: commitResult.results[0]?.id ?? orderId,
        duplicate: false,
      };
    } catch (error) {
      // The deterministic document ID closes concurrent webhook/retry races.
      const duplicate = await writeClient.fetch(
        ORDER_BY_PAYSTACK_REFERENCE_QUERY,
        { paystackReference: reference },
      );
      if (duplicate) {
        return { orderId: duplicate._id, duplicate: true };
      }
      if (attempt === MAX_INVENTORY_ATTEMPTS - 1) {
        const createdOrder = await writeClient.createIfNotExists({
          ...orderDocument,
          inventoryAdjusted: false,
          inventoryIssue: "Inventory changed repeatedly while recording payment",
        });
        logPaymentEvent("error", "payment.inventory_reconciliation.required", {
          orderId,
          reference,
          inventoryIssue: "concurrent inventory changes",
        }, error);
        return { orderId: createdOrder._id, duplicate: false };
      }
    }
  }

  return { orderId, duplicate: false };
}
