"use client";

import { cn, formatPrice } from "@/lib/utils";

export interface PriceBucket {
  min: number;
  max: number;
}

interface PriceRangeFilterProps {
  buckets: PriceBucket[];
  currentMin: number;
  currentMax: number;
  onChange: (range: PriceBucket | null) => void;
}

export function PriceRangeFilter({
  buckets,
  currentMin,
  currentMax,
  onChange,
}: PriceRangeFilterProps) {
  if (buckets.length === 0) {
    return <p className="text-sm text-zinc-500">No priced products available</p>;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "w-full rounded-md px-2 py-1.5 text-left text-sm",
          currentMin === 0 && currentMax === 0
            ? "bg-amber-50 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
        )}
      >
        All prices
      </button>
      {buckets.map((bucket) => {
        const active = currentMin === bucket.min && currentMax === bucket.max;
        return (
          <button
            key={`${bucket.min}-${bucket.max}`}
            type="button"
            onClick={() => onChange(bucket)}
            className={cn(
              "w-full rounded-md px-2 py-1.5 text-left text-sm",
              active
                ? "bg-amber-50 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            {formatPrice(bucket.min)} – {formatPrice(bucket.max)}
          </button>
        );
      })}
    </div>
  );
}
