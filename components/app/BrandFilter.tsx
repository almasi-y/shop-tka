"use client";

import type { ALL_BRANDS_QUERY_RESULT } from "@/sanity.types";

interface BrandFilterProps {
  brands: ALL_BRANDS_QUERY_RESULT;
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
}

export function BrandFilter({
  brands,
  selectedSlugs,
  onChange,
}: BrandFilterProps) {
  const selected = new Set(selectedSlugs);

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
      {brands.length === 0 ? (
        <p className="text-sm text-zinc-500">No brands available</p>
      ) : (
        brands.map((brand) => {
          if (!brand.slug) return null;
          const checked = selected.has(brand.slug);

          return (
            <label
              key={brand._id}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? selectedSlugs.filter((slug) => slug !== brand.slug)
                      : [...selectedSlugs, brand.slug as string],
                  )
                }
                className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand dark:border-zinc-600 dark:bg-zinc-800"
              />
              <span>{brand.title}</span>
            </label>
          );
        })
      )}
    </div>
  );
}
