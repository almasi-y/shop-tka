import { at, defineMigration, setIfMissing } from "sanity/migrate";

interface LegacyOrderItem {
  _key?: string;
  product?: {
    _ref?: string;
    _weak?: boolean;
  };
  quantity?: number;
  priceAtPurchase?: number;
}

export default defineMigration({
  title: "Normalize legacy order fields",
  documentTypes: ["order"],
  migrate: {
    document(document) {
      const legacyItems = Array.isArray(document.items)
        ? (document.items as LegacyOrderItem[])
        : [];
      const products = legacyItems.flatMap((item, index) =>
        item.product?._ref
          ? [
              {
                _key: item._key ?? `product${index}`,
                _type: "reference" as const,
                _ref: item.product._ref,
                ...(item.product._weak ? { _weak: true } : {}),
              },
            ]
          : [],
      );
      const quantities = legacyItems
        .filter((item) => item.product?._ref)
        .map((item) => item.quantity ?? 1);
      const productPrices = legacyItems
        .filter((item) => item.product?._ref)
        .map((item) => item.priceAtPurchase)
        .filter((price): price is number => typeof price === "number");

      const mutations = [];

      if (products.length > 0) {
        mutations.push(at("products", setIfMissing(products)));
        mutations.push(at("quantities", setIfMissing(quantities)));
        if (productPrices.length === products.length) {
          mutations.push(at("productPrices", setIfMissing(productPrices)));
        }
      }
      if (typeof document.total === "number") {
        mutations.push(at("totalPrice", setIfMissing(document.total)));
      }
      if (typeof document.email === "string") {
        mutations.push(at("customerEmail", setIfMissing(document.email)));
      }
      if (document.address && typeof document.address === "object") {
        mutations.push(at("shippingAddress", setIfMissing(document.address)));
      }
      if (typeof document.paystackPaymentId === "string") {
        mutations.push(
          at("paystackReference", setIfMissing(document.paystackPaymentId)),
        );
      }

      return mutations;
    },
  },
});
