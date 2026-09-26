"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeft, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "../ProductGrid";
import type { PriceBucket } from "@/components/app/PriceRangeFilter";
import type {
  ALL_BRANDS_QUERY_RESULT,
  ALL_CATEGORIES_QUERY_RESULT,
  FILTER_PRODUCTS_BY_NAME_QUERY_RESULT,
} from "@/sanity.types";

interface ProductSectionProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
  brands: ALL_BRANDS_QUERY_RESULT;
  priceBuckets: PriceBucket[];
  products: FILTER_PRODUCTS_BY_NAME_QUERY_RESULT;
  searchQuery: string;
  categorySlug: string;
}

export function ProductSection({
  categories,
  brands,
  priceBuckets,
  products,
  searchQuery,
  categorySlug,
}: ProductSectionProps) {
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileFiltersOpen]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with results count and filter toggle */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {products.length} {products.length === 1 ? "product" : "products"}{" "}
          found
          {searchQuery && (
            <span>
              {" "}
              for &quot;<span className="font-medium">{searchQuery}</span>&quot;
            </span>
          )}
        </p>

        {/* Mobile filters open in an overlay so the catalogue remains visible. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center gap-2 border-zinc-300 bg-white shadow-sm transition-all hover:bg-zinc-50 lg:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-haspopup="dialog"
          aria-expanded={mobileFiltersOpen}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>

        {/* Desktop filter toggle retains the existing sidebar behaviour. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDesktopFiltersOpen(!desktopFiltersOpen)}
          className="hidden items-center gap-2 border-zinc-300 bg-white shadow-sm transition-all hover:bg-zinc-50 lg:flex dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-label={desktopFiltersOpen ? "Hide filters" : "Show filters"}
          aria-expanded={desktopFiltersOpen}
        >
          {desktopFiltersOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
          {desktopFiltersOpen ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex gap-8">
        {/* Desktop sidebar filters */}
        <aside
          className={
            desktopFiltersOpen
              ? "hidden w-72 shrink-0 lg:block"
              : "hidden"
          }
        >
          <ProductFilters
            categories={categories}
            brands={brands}
            priceBuckets={priceBuckets}
            categorySlug={categorySlug}
          />
        </aside>

        {/* Product Grid - expands to full width when filters hidden */}
        <main className="flex-1 transition-all duration-300">
          <ProductGrid products={products} />
        </main>
      </div>

      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-[70] flex justify-end lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filters-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          />
          <div className="relative flex h-full w-[min(92vw,24rem)] flex-col bg-white shadow-2xl dark:bg-zinc-950">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 id="mobile-filters-title" className="text-lg font-semibold">
                Filter products
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ProductFilters
                categories={categories}
                brands={brands}
                priceBuckets={priceBuckets}
                categorySlug={categorySlug}
                className="rounded-none border-0 p-5"
              />
            </div>

            <div className="shrink-0 border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <Button
                type="button"
                className="h-11 w-full"
                onClick={() => setMobileFiltersOpen(false)}
              >
                View {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
