import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { AskAISimilarButton } from "@/components/app/AskAISimilarButton";
import { StockBadge } from "@/components/app/StockBadge";
import { formatPrice } from "@/lib/utils";
import type { PRODUCT_BY_SLUG_QUERY_RESULT } from "@/sanity.types";

interface ProductInfoProps {
  product: NonNullable<PRODUCT_BY_SLUG_QUERY_RESULT>;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const imageUrl = product.images?.[0]?.asset?.url;

  return (
    <div className="flex flex-col">
      {/* Category */}
      {product.category && (
        <Link
          href={`/category/${product.category.slug}`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {product.category.title}
        </Link>
      )}

      {/* Title */}
      <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
        {product.name}
      </h1>

      {/* Price */}
      <p className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {formatPrice(product.price)}
      </p>

      {/* Description */}
      {product.description && (
        <p className="mt-4 whitespace-pre-line text-zinc-600 dark:text-zinc-400">
          {product.description}
        </p>
      )}

      {product.features && product.features.length > 0 && (
        <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Features
          </h2>
          <div className="mt-4 space-y-4">
            {product.features.map((feature) => (
              <div key={feature._key} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock & Add to Cart */}
      <div className="mt-6 flex flex-col gap-3">
        <StockBadge productId={product._id} stock={product.stock ?? 0} />
        <AddToCartButton
          productId={product._id}
          slug={product.slug ?? undefined}
          name={product.name ?? "Unknown Product"}
          price={product.price ?? 0}
          image={imageUrl ?? undefined}
          stock={product.stock ?? 0}
        />
        <AskAISimilarButton
          productName={product.name ?? "this product"}
          category={product.category?.title}
          brand={product.brand?.title}
          color={product.color}
          size={product.size}
        />
      </div>

      {/* Metadata */}
      <div className="mt-6 space-y-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {product.brand && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Brand</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.brand.title}
            </span>
          </div>
        )}
        {product.color && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Color</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.color}
            </span>
          </div>
        )}
        {product.size && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Size</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.size}
            </span>
          </div>
        )}
        {product.dimensions && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Dimensions</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.dimensions}
            </span>
          </div>
        )}
        {product.assemblyRequired !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Assembly</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.assemblyRequired ? "Required" : "Not required"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
