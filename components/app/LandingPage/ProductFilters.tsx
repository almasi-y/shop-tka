"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategorySidebar } from "@/components/app/CategorySidebar";
import { BrandFilter } from "@/components/app/BrandFilter";
import {
  PriceRangeFilter,
  type PriceBucket,
} from "@/components/app/PriceRangeFilter";
import { SORT_OPTIONS } from "@/lib/constants/filters";
import type {
  ALL_BRANDS_QUERY_RESULT,
  ALL_CATEGORIES_QUERY_RESULT,
} from "@/sanity.types";

interface ProductFiltersProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
  brands: ALL_BRANDS_QUERY_RESULT;
  priceBuckets: PriceBucket[];
  categorySlug: string;
}

function FilterLabel({
  children,
  isActive,
  filterKey,
  onClear,
}: {
  children: React.ReactNode;
  isActive: boolean;
  filterKey: string;
  onClear: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {children}
        {isActive && (
          <Badge className="ml-2 h-5 bg-amber-500 px-1.5 text-xs text-white hover:bg-amber-500">
            Active
          </Badge>
        )}
      </span>
      {isActive && (
        <button
          type="button"
          onClick={onClear}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          aria-label={`Clear ${filterKey} filter`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ProductFilters({
  categories,
  brands,
  priceBuckets,
  categorySlug,
}: ProductFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("q") ?? "";
  const currentCategory = categorySlug || searchParams.get("category") || "";
  const currentBrands = (searchParams.get("brand") ?? "")
    .split(",")
    .filter(Boolean);
  const currentSort = searchParams.get("sort") ?? "name";
  const currentMinPrice = Number(searchParams.get("minPrice")) || 0;
  const currentMaxPrice = Number(searchParams.get("maxPrice")) || 0;
  const currentInStock = searchParams.get("inStock") === "true";

  const isSearchActive = Boolean(currentSearch);
  const isCategoryActive = Boolean(currentCategory);
  const isBrandActive = currentBrands.length > 0;
  const isPriceActive = currentMinPrice > 0 || currentMaxPrice > 0;
  const isInStockActive = currentInStock;
  const activeFilterCount = [
    isSearchActive,
    isCategoryActive,
    isBrandActive,
    isPriceActive,
    isInStockActive,
  ].filter(Boolean).length;

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === 0) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearSingleFilter = (key: string) => {
    if (key === "price") {
      updateParams({ minPrice: null, maxPrice: null });
      return;
    }
    if (key === "category") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      const query = params.toString();
      router.push(query ? `/?${query}` : "/", { scroll: false });
      return;
    }
    updateParams({ [key]: null });
  };

  return (
    <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      {activeFilterCount > 0 && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} applied
          </p>
          <Button
            size="sm"
            onClick={() =>
              router.push(categorySlug ? "/" : pathname, { scroll: false })
            }
            className="w-full bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            <X className="mr-2 h-4 w-4" />
            Clear All Filters
          </Button>
        </div>
      )}

      <div>
        <FilterLabel
          isActive={isSearchActive}
          filterKey="q"
          onClear={() => clearSingleFilter("q")}
        >
          Search
        </FilterLabel>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("search");
            updateParams({ q: typeof value === "string" ? value : null });
          }}
          className="flex gap-2"
        >
          <Input
            name="search"
            placeholder="Search products..."
            defaultValue={currentSearch}
            className={isSearchActive ? "border-amber-500 ring-1 ring-amber-500" : ""}
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
      </div>

      <div>
        <FilterLabel
          isActive={isCategoryActive}
          filterKey="category"
          onClear={() => clearSingleFilter("category")}
        >
          Categories
        </FilterLabel>
        <CategorySidebar
          categories={categories}
          selectedSlug={currentCategory}
          onSelect={(slug) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("category");
            const query = params.toString();
            const target = slug ? `/category/${slug}` : "/";
            router.push(query ? `${target}?${query}` : target, {
              scroll: false,
            });
          }}
        />
      </div>

      <div>
        <FilterLabel
          isActive={isBrandActive}
          filterKey="brand"
          onClear={() => clearSingleFilter("brand")}
        >
          Popular Brands
        </FilterLabel>
        <BrandFilter
          brands={brands}
          selectedSlugs={currentBrands}
          onChange={(slugs) =>
            updateParams({ brand: slugs.length > 0 ? slugs.join(",") : null })
          }
        />
      </div>

      <div>
        <FilterLabel
          isActive={isPriceActive}
          filterKey="price"
          onClear={() => clearSingleFilter("price")}
        >
          Shop by Price
        </FilterLabel>
        <PriceRangeFilter
          buckets={priceBuckets}
          currentMin={currentMinPrice}
          currentMax={currentMaxPrice}
          onChange={(range) =>
            updateParams({
              minPrice: range?.min ?? null,
              maxPrice: range?.max ?? null,
            })
          }
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={currentInStock}
          onChange={(event) =>
            updateParams({ inStock: event.target.checked ? "true" : null })
          }
          className="h-5 w-5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Show only in-stock
          {isInStockActive && (
            <Badge className="ml-2 h-5 bg-amber-500 px-1.5 text-xs text-white hover:bg-amber-500">
              Active
            </Badge>
          )}
        </span>
      </label>

      <div>
        <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Sort By
        </span>
        <Select
          value={currentSort}
          onValueChange={(value) => updateParams({ sort: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
