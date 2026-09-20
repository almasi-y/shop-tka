import crypto from "node:crypto";
import { writeClient } from "@/sanity/lib/client";
import { ORDER_BY_PAYSTACK_REFERENCE_QUERY } from "@/lib/sanity/queries/orders";
import { shippingAddressSchema } from "@/lib/checkout/shipping-address";

type PaystackEvent = {
  event?: string;
  data?: {
    id?: number;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    email?: string;
    customer?: {
      email?: string;
      customer_code?: string;
    };
    metadata?: {
      clerkUserId?: string;
      productIds?: string[];
      quantities?: number[];
      productPrices?: number[];
      shippingAddress?: unknown;
    };
  };
};

type InventoryProduct = {
  _id: string;
  _rev: string;
  stock: number | null;
};

const MAX_INVENTORY_ATTEMPTS = 3;

function signaturesMatch(body: string, signature: string, secret: string) {
  if (!/^[a-f\d]{128}$/i.test(signature)) return false;

  const expected = crypto.createHmac("sha512", secret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return Response.json({ error: "Paystack is not configured" }, { status: 500 });
  }

  if (!process.env.SANITY_API_WRITE_TOKEN) {
    return Response.json(
      { error: "Sanity writes are not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!signature || !signaturesMatch(body, signature, secret)) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(body) as PaystackEvent;
  } catch {
    return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  if (event.event !== "charge.success" || !event.data) {
    return Response.json({ received: true });
  }

  const transaction = event.data;
  const reference = transaction.reference;
  const metadata = transaction.metadata;
  const productIds = metadata?.productIds;
  const quantities = metadata?.quantities;
  const productPrices = metadata?.productPrices;
  const parsedAddress = shippingAddressSchema.safeParse(
    metadata?.shippingAddress,
  );

  if (
    !reference ||
    !metadata?.clerkUserId ||
    !productIds?.length ||
    !quantities ||
    !productPrices ||
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
    return Response.json({ error: "Incomplete Paystack metadata" }, { status: 400 });
  }

  const existingOrder = await writeClient.fetch(ORDER_BY_PAYSTACK_REFERENCE_QUERY, {
    paystackReference: reference,
  });

  if (existingOrder) {
    return Response.json({ received: true, duplicate: true });
  }

  const total = quantities.reduce(
    (sum, quantity, index) => sum + productPrices[index] * quantity,
    0,
  );

  if (
    transaction.status !== "success" ||
    transaction.currency?.toUpperCase() !== "KES" ||
    transaction.amount !== Math.round(total * 100)
  ) {
    return Response.json({ error: "Paystack payment validation failed" }, { status: 400 });
  }

  const referenceHash = crypto
    .createHash("sha256")
    .update(reference)
    .digest("hex");
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${referenceHash.slice(0, 6).toUpperCase()}`;
  const orderId = `order.paystack.${referenceHash}`;
  const customerEmail = transaction.customer?.email ?? transaction.email;
  if (!customerEmail) {
    return Response.json({ error: "Paystack customer email is missing" }, { status: 400 });
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
    totalPrice: total,
    status: "paid",
    paystackReference: reference,
    createdAt: new Date().toISOString(),
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

    // A payment is already complete at this point. Always retain its order,
    // even when inventory can no longer be decremented safely.
    if (inventoryIssue) {
      const createdOrder = await writeClient.createIfNotExists({
        ...orderDocument,
        inventoryAdjusted: false,
        inventoryIssue,
      });
      console.error("Paid order requires inventory reconciliation", {
        orderId,
        reference,
        inventoryIssue,
      });
      return Response.json({ received: true, orderId: createdOrder._id });
    }

    try {
      const transactionBuilder = productIds.reduce(
        (transaction, productId, index) => {
          const product = productById.get(productId)!;
          return transaction.patch(productId, (patch) =>
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
      return Response.json({
        received: true,
        orderId: commitResult.results[0]?.id,
      });
    } catch (error) {
      // A deterministic document ID closes the race between concurrent retries.
      const duplicate = await writeClient.fetch(
        ORDER_BY_PAYSTACK_REFERENCE_QUERY,
        { paystackReference: reference },
      );
      if (duplicate) {
        return Response.json({ received: true, duplicate: true });
      }
      if (attempt === MAX_INVENTORY_ATTEMPTS - 1) {
        const createdOrder = await writeClient.createIfNotExists({
          ...orderDocument,
          inventoryAdjusted: false,
          inventoryIssue: "Inventory changed repeatedly while recording payment",
        });
        console.error("Paid order requires inventory reconciliation", {
          orderId,
          reference,
          error,
        });
        return Response.json({ received: true, orderId: createdOrder._id });
      }
    }
  }

  return Response.json({ received: true, orderId });
}
