import { Skeleton } from "@/components/ui/skeleton";

export function ProductInfoSkeleton() {
  return (
    <div className="flex flex-col space-y-6">
      {/* Brand */}
      <Skeleton className="h-4 w-24" />

      {/* Title */}
      <Skeleton className="h-9 w-3/4" />

      {/* Price */}
      <Skeleton className="h-8 w-28" />

      {/* Primary purchase controls */}
      <div className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-11 w-full" />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Stock Badge */}
      <Skeleton className="h-6 w-20" />

      {/* Product Details */}
      <div className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

    </div>
  );
}