export type ReturnProductSnapshot = {
  _id: string;
  name: string | null;
  returnEligibility?: string | null;
  returnWindowDays?: number | null;
  returnPolicyNote?: string | null;
};

export type ReturnOrderSource = {
  products?: Array<ReturnProductSnapshot | null> | null;
  quantities?: Array<number | null> | null;
  productPrices?: Array<number | null> | null;
  legacyItems?: Array<{
    product?: ReturnProductSnapshot | null;
    quantity?: number | null;
    priceAtPurchase?: number | null;
  } | null> | null;
};

export type NormalizedReturnItem = {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
  returnEligibility: "standard" | "defects_only" | "non_returnable";
  returnWindowDays: 7 | 14;
  returnPolicyNote?: string;
};

function normalizeProduct(
  product: ReturnProductSnapshot | null | undefined,
  quantity: number | null | undefined,
  price: number | null | undefined,
): NormalizedReturnItem | null {
  if (!product?._id || !quantity || quantity < 1) return null;

  const eligibility =
    product.returnEligibility === "defects_only" ||
    product.returnEligibility === "non_returnable"
      ? product.returnEligibility
      : "standard";

  return {
    productId: product._id,
    productName: product.name?.trim() || "Product",
    quantity,
    priceAtPurchase: Math.max(0, price ?? 0),
    returnEligibility: eligibility,
    returnWindowDays: product.returnWindowDays === 7 ? 7 : 14,
    returnPolicyNote: product.returnPolicyNote?.trim() || undefined,
  };
}

export function normalizeReturnOrderItems(
  order: ReturnOrderSource,
): NormalizedReturnItem[] {
  const canonical = (order.products ?? []).flatMap((product, index) => {
    const item = normalizeProduct(
      product,
      order.quantities?.[index],
      order.productPrices?.[index],
    );
    return item ? [item] : [];
  });

  if (canonical.length > 0) return canonical;

  return (order.legacyItems ?? []).flatMap((item) => {
    const normalized = normalizeProduct(
      item?.product,
      item?.quantity,
      item?.priceAtPurchase,
    );
    return normalized ? [normalized] : [];
  });
}

export function returnDeadline(deliveryDate: string, windowDays: number) {
  const deadline = new Date(deliveryDate);
  deadline.setDate(deadline.getDate() + windowDays);
  return deadline;
}

