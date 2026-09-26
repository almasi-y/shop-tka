import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import type { SearchProduct } from "@/lib/ai/types";

interface ProductCardWidgetProps {
  product: SearchProduct;
  onClose: () => void;
}

export function ProductCardWidget({
  product,
  onClose,
}: ProductCardWidgetProps) {
  const isOutOfStock = product.stockStatus === "out_of_stock";
  const isLowStock = product.stockStatus === "low_stock";

  const handleClick = () => {
    // Only close chat on mobile (< 768px)
    if (window.matchMedia("(max-width: 767px)").matches) {
      onClose();
    }
  };

  const cardContent = (
    <>
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name ?? "Product"}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-lg bg-zinc-100 object-contain p-1 transition-transform duration-200 group-hover:scale-[1.03] dark:bg-zinc-700"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 transition-colors duration-200 group-hover:bg-zinc-200 dark:bg-zinc-700 dark:group-hover:bg-zinc-600">
          <Package className="h-5 w-5 text-zinc-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-zinc-900 transition-colors duration-200 group-hover:text-brand dark:text-zinc-100 dark:group-hover:text-brand-light">
              {product.name}
            </span>
            {(product.category || product.brand) && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {[product.brand, product.category].filter(Boolean).join(" • ")}
              </span>
            )}
          </div>
          {product.priceFormatted && (
            <span className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {product.priceFormatted}
            </span>
          )}
        </div>
        {(isOutOfStock || isLowStock) && (
          <span
            className={`mt-1 inline-block text-xs font-medium ${
              isOutOfStock
                ? "text-red-600 dark:text-red-400"
                : "text-brand dark:text-brand-light"
            }`}
          >
            {isOutOfStock ? "Out of stock" : "Low stock"}
          </span>
        )}
      </div>
    </>
  );

  const cardClasses =
    "group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all duration-200 hover:border-brand/30 hover:shadow-md hover:shadow-brand/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-brand/50 dark:hover:shadow-brand/20";

  if (product.productUrl) {
    return (
      <Link
        href={product.productUrl}
        onClick={handleClick}
        className={cardClasses}
      >
        {cardContent}
      </Link>
    );
  }

  return <div className={cardClasses}>{cardContent}</div>;
}
