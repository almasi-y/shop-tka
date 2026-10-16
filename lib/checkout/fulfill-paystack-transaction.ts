import crypto from "node:crypto";
import { writeClient } from "@/sanity/lib/client";
import { ORDER_BY_PAYSTACK_REFERENCE_QUERY } from "@/lib/sanity/queries/orders";
import { shippingAddressSchema } from "@/lib/checkout/shipping-address";
import {
  createTrackingEventKey,
  createTrackingNumber,
} from "@/lib/orders/tracking";
import {
  logPaymentEvent,
  reportPaymentFailure,
} from "@/lib/payments/observability";

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

type SavedCartItem = {
  _key: string;
  _type: "object";
  product: {
    _type: "reference";
    _ref: string;
  };
  productName: string;
  priceAtSave: number;
  quantity: number;
  imageUrl?: string;
  slug?: string;
};

type SavedCart = {
  _id: string;
  _rev: string;
  items: SavedCartItem[] | null;
};

type FulfillmentResult = {
  orderId: string;
  duplicate: boolean;
};

const MAX_INVENTORY_ATTEMPTS = 3;

const SAVED_CART_FOR_FULFILLMENT_QUERY = `*[
  _type == "shoppingCart"
  && clerkUserId == $clerkUserId
] | order(updatedAt desc)[0] {
  _id,
  _rev,
  items
}`;

function removePurchasedItems(
  cartItems: SavedCartItem[] | null,
  productIds: string[],
  quantities: number[],
) {
  const remainingPurchasedQuantities = new Map(
    productIds.map((productId, index) => [productId, quantities[index]]),
  );

  return (cartItems ?? []).flatMap((item) => {
    const purchasedQuantity = remainingPurchasedQuantities.get(
      item.product._ref,
    );
    if (!purchasedQuantity) return [item];

    if (item.quantity <= purchasedQuantity) {
      remainingPurchasedQuantities.delete(item.product._ref);
      return [];
    }

    remainingPurchasedQuantities.delete(item.product._ref);
    return [{ ...item, quantity: item.quantity - purchasedQuantity }];
  });
}

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
    const [products, savedCart] = await Promise.all([
      writeClient.fetch<InventoryProduct[]>(
        `*[_type == "product" && _id in $ids]{_id, _rev, stock}`,
        { ids: productIds },
      ),
      writeClient.fetch<SavedCart | null>(
        SAVED_CART_FOR_FULFILLMENT_QUERY,
        { clerkUserId: metadata.clerkUserId },
      ),
    ]);
    const productById = new Map(
      products.map((product) => [product._id, product]),
    );
    const cartClearedAt = new Date().toISOString();
    const remainingCartItems = removePurchasedItems(
      savedCart?.items ?? null,
      productIds,
      quantities,
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
      try {
        let transactionBuilder = writeClient
          .transaction()
          .createIfNotExists({
            ...orderDocument,
            inventoryAdjusted: false,
            inventoryIssue,
            cartClearedAt,
          });
        if (savedCart) {
          transactionBuilder = transactionBuilder.patch(
            savedCart._id,
            (patch) =>
              patch
                .ifRevisionId(savedCart._rev)
                .set({ items: remainingCartItems, updatedAt: cartClearedAt }),
          );
        }
        await transactionBuilder.commit();
        logPaymentEvent("error", "payment.inventory_reconciliation.required", {
          orderId,
          reference,
          inventoryIssue,
        });
        return { orderId, duplicate: false };
      } catch (error) {
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
            inventoryIssue,
          });
          await reportPaymentFailure(
            "payment.cart_reconciliation.required",
            { orderId, reference },
            error,
          );
          return { orderId: createdOrder._id, duplicate: false };
        }
        continue;
      }
    }

    try {
      let transactionBuilder = productIds.reduce(
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
          cartClearedAt,
        }),
      );
      if (savedCart) {
        transactionBuilder = transactionBuilder.patch(
          savedCart._id,
          (patch) =>
            patch
              .ifRevisionId(savedCart._rev)
              .set({ items: remainingCartItems, updatedAt: cartClearedAt }),
        );
      }
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
        const inventoryIssue =
          "Inventory changed repeatedly while recording payment";
        let createdOrderId = orderId;
        try {
          const cartClearedAt = new Date().toISOString();
          let recoveryTransaction = writeClient
            .transaction()
            .createIfNotExists({
              ...orderDocument,
              inventoryAdjusted: false,
              inventoryIssue,
              cartClearedAt,
            });
          if (savedCart) {
            recoveryTransaction = recoveryTransaction.patch(
              savedCart._id,
              (patch) =>
                patch
                  .ifRevisionId(savedCart._rev)
                  .set({ items: remainingCartItems, updatedAt: cartClearedAt }),
            );
          }
          await recoveryTransaction.commit();
        } catch (cartError) {
          const createdOrder = await writeClient.createIfNotExists({
            ...orderDocument,
            inventoryAdjusted: false,
            inventoryIssue,
          });
          createdOrderId = createdOrder._id;
          await reportPaymentFailure(
            "payment.cart_reconciliation.required",
            { orderId, reference },
            cartError,
          );
        }
        logPaymentEvent("error", "payment.inventory_reconciliation.required", {
          orderId,
          reference,
          inventoryIssue: "concurrent inventory changes",
        }, error);
        return { orderId: createdOrderId, duplicate: false };
      }
    }
  }

  return { orderId, duplicate: false };
}
