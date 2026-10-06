import { auth, currentUser } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products";
import { shippingAddressSchema } from "@/lib/checkout/shipping-address";
import { getShippingRates } from "@/lib/shipping/get-shipping-rates";
import { getShippingFee } from "@/lib/shipping/kenya";

const PAYSTACK_API_URL = "https://api.paystack.co/transaction/initialize";
const CURRENCY = "KES";

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

function toSubunits(amount: number) {
  const subunits = Math.round(amount * 100);
  return Number.isSafeInteger(subunits) ? subunits : null;
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return Response.json(
        { error: "Please sign in to checkout" },
        { status: 401 },
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return Response.json(
        { error: "Paystack is not configured on the server" },
        { status: 500 },
      );
    }

    let body: {
      items?: CheckoutItem[];
      shippingAddress?: unknown;
      expectedShippingFee?: unknown;
    };
    try {
      body = (await request.json()) as {
        items?: CheckoutItem[];
        shippingAddress?: unknown;
        expectedShippingFee?: unknown;
      };
    } catch {
      return Response.json(
        { error: "Invalid checkout request" },
        { status: 400 },
      );
    }

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Your cart is empty" }, { status: 400 });
    }

    const invalidItem = items.find(
      (item) =>
        typeof item?.productId !== "string" ||
        item.productId.length === 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1,
    );
    if (invalidItem) {
      return Response.json({ error: "Invalid cart item" }, { status: 400 });
    }

    const parsedAddress = shippingAddressSchema.safeParse(body.shippingAddress);
    if (!parsedAddress.success) {
      return Response.json(
        { error: "Please enter a complete shipping address" },
        { status: 400 },
      );
    }

    const shippingRates = await getShippingRates();
    const shippingFee = getShippingFee(
      parsedAddress.data.county,
      shippingRates,
    );
    if (
      typeof body.expectedShippingFee !== "number" ||
      !Number.isSafeInteger(body.expectedShippingFee) ||
      body.expectedShippingFee !== shippingFee
    ) {
      return Response.json(
        { error: "Shipping rates changed. Refresh checkout and try again." },
        { status: 409 },
      );
    }

    // Aggregate duplicate IDs before validating stock and constructing metadata.
    const quantityByProductId = new Map<string, number>();
    for (const item of items) {
      const quantity =
        (quantityByProductId.get(item.productId) ?? 0) + item.quantity;
      if (!Number.isSafeInteger(quantity)) {
        return Response.json(
          { error: "Invalid cart quantity" },
          { status: 400 },
        );
      }
      quantityByProductId.set(item.productId, quantity);
    }

    const normalizedItems = [...quantityByProductId].map(
      ([productId, quantity]) => ({ productId, quantity }),
    );
    const productIds = normalizedItems.map((item) => item.productId);
    const products = await client.withConfig({ useCdn: false }).fetch(
      PRODUCTS_BY_IDS_QUERY,
      { ids: productIds },
    );

    if (products.length !== productIds.length) {
      return Response.json(
        { error: "A product in your cart is no longer available" },
        { status: 409 },
      );
    }

    const validationErrors: string[] = [];
    const productPrices: number[] = [];
    let subtotalInSubunits = 0;

    for (const item of normalizedItems) {
      const product = products.find(
        (candidate) => candidate._id === item.productId,
      );

      if (!product) {
        validationErrors.push("A product in your cart is no longer available");
        continue;
      }

      if (
        typeof product.price !== "number" ||
        !Number.isFinite(product.price) ||
        product.price <= 0
      ) {
        validationErrors.push(
          `${product.name ?? "A product"} has an invalid price`,
        );
        continue;
      }

      const stock = product.stock ?? 0;
      if (stock < item.quantity) {
        validationErrors.push(
          `${product.name ?? "A product"} has only ${stock} available`,
        );
        continue;
      }

      productPrices.push(product.price);
      const unitPriceInSubunits = toSubunits(product.price);
      if (unitPriceInSubunits === null || unitPriceInSubunits <= 0) {
        validationErrors.push(
          `${product.name ?? "A product"} has an invalid price`,
        );
        continue;
      }
      subtotalInSubunits += unitPriceInSubunits * item.quantity;
    }

    const shippingFeeInSubunits = toSubunits(shippingFee);
    const amountInSubunits =
      shippingFeeInSubunits === null
        ? Number.NaN
        : subtotalInSubunits + shippingFeeInSubunits;
    if (
      !Number.isSafeInteger(amountInSubunits) ||
      amountInSubunits <= 0
    ) {
      return Response.json(
        { error: "The checkout total is invalid" },
        { status: 400 },
      );
    }

    const subtotalMajorUnits = subtotalInSubunits / 100;
    const totalMajorUnits = amountInSubunits / 100;

    if (validationErrors.length > 0) {
      return Response.json(
        { error: validationErrors.join(". ") },
        { status: 409 },
      );
    }

    const primaryEmail = user.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId,
    );
    const email =
      primaryEmail?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return Response.json(
        { error: "Your account does not have an email address" },
        { status: 400 },
      );
    }

    const reference = `order-${crypto.randomUUID()}`;
    const response = await fetch(PAYSTACK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: String(amountInSubunits),
        currency: CURRENCY,
        reference,
        callback_url: `${getBaseUrl()}/checkout/success`,
        metadata: {
          clerkUserId: userId,
          productIds,
          quantities: normalizedItems.map((item) => item.quantity),
          productPrices,
          subtotal: subtotalMajorUnits,
          shippingFee,
          total: totalMajorUnits,
          shippingAddress: parsedAddress.data,
          custom_fields: [
            {
              display_name: "Shipping fee",
              variable_name: "shipping_fee",
              value: `KES ${shippingFee.toFixed(2)}`,
            },
            {
              display_name: "Shipping county",
              variable_name: "shipping_county",
              value: parsedAddress.data.county,
            },
          ],
        },
      }),
    });

    const result = (await response.json()) as PaystackInitializeResponse;
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      console.error("Paystack initialization failed", result.message);
      return Response.json(
        { error: "Unable to initialize Paystack checkout" },
        { status: 502 },
      );
    }

    return Response.json({
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference,
      subtotal: subtotalMajorUnits,
      shippingFee,
      total: totalMajorUnits,
    });
  } catch (error) {
    console.error("Checkout initialization failed", error);
    return Response.json(
      { error: "Unable to initialize checkout" },
      { status: 500 },
    );
  }
}
