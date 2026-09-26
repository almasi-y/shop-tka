"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { StockBadge } from "@/components/app/StockBadge";
import type { FILTER_PRODUCTS_BY_NAME_QUERY_RESULT } from "@/sanity.types";

type Product = FILTER_PRODUCTS_BY_NAME_QUERY_RESULT[number];

interface ProductCardProps {
  product: Product;
  eager?: boolean;
}

export function ProductCard({ product, eager = false }: ProductCardProps) {
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(
    null,
  );

  const images = product.images ?? [];
  const mainImageUrl = images[0]?.asset?.url;
  const displayedImageUrl =
    hoveredImageIndex !== null
      ? images[hoveredImageIndex]?.asset?.url
      : mainImageUrl;

  const stock = product.stock ?? 0;
  const hasMultipleImages = images.length > 1;

  return (
    <Card className="group relative flex h-full flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-sm ring-1 ring-zinc-950/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10 dark:hover:shadow-zinc-950/50">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-4/3 overflow-hidden bg-linear-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900">
          {displayedImageUrl ? (
            <Image
              src={displayedImageUrl}
              alt={product.name ?? "Product image"}
              fill
              className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:p-4"
              sizes="(max-width: 1023px) 50vw, 25vw"
              loading={eager ? "eager" : "lazy"}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <svg
                className="h-16 w-16 opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          {/* Gradient overlay for text contrast */}
          <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      </Link>

      {/* Keep alternate views available on larger screens without lengthening mobile cards. */}
      {hasMultipleImages && (
        <div className="hidden gap-2 border-t border-zinc-100 bg-zinc-50/50 p-2 md:flex dark:border-zinc-800 dark:bg-zinc-800/50">
          {images.map((image, index) => (
            <button
              key={image._key ?? index}
              type="button"
              className={cn(
                "relative h-11 flex-1 overflow-hidden rounded-lg transition-all duration-200",
                hoveredImageIndex === index
                  ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-900"
                  : "opacity-50 hover:opacity-100",
              )}
              onMouseEnter={() => setHoveredImageIndex(index)}
              onMouseLeave={() => setHoveredImageIndex(null)}
            >
              {image.asset?.url && (
                <Image
                  src={image.asset.url}
                  alt={`${product.name} - view ${index + 1}`}
                  fill
                  className="object-contain p-1"
                  sizes="100px"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <CardContent className="flex grow flex-col justify-between gap-3 p-3 sm:p-4">
        <Link href={`/products/${product.slug}`} className="block">
          {product.brand?.title && (
            <p className="mb-1 line-clamp-1 text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs dark:text-zinc-400">
              {product.brand.title}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-zinc-900 transition-colors group-hover:text-zinc-600 sm:text-base dark:text-zinc-100 dark:group-hover:text-zinc-300">
            {product.name}
          </h3>
        </Link>
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <p className="text-base font-bold tracking-tight text-zinc-900 sm:text-xl dark:text-white">
            {formatPrice(product.price)}
          </p>
          <StockBadge
            productId={product._id}
            stock={stock}
            className="max-w-full text-[0.65rem] sm:text-xs"
          />
        </div>
      </CardContent>

      <CardFooter className="mt-auto border-t-0 bg-transparent p-3 pt-0 sm:p-4 sm:pt-0">
        <AddToCartButton
          productId={product._id}
          slug={product.slug ?? undefined}
          name={product.name ?? "Unknown Product"}
          price={product.price ?? 0}
          image={mainImageUrl ?? undefined}
          stock={stock}
          className="h-10 sm:h-11"
        />
      </CardFooter>
    </Card>
  );
}
