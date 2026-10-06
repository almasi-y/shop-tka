import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedCarouselSkeleton() {
  return (
    <div className="relative w-full bg-brand-mist dark:bg-brand-night">
      <div className="flex flex-col md:h-[400px] md:flex-row lg:h-[420px]">
        {/* Image Section Skeleton */}
        <div className="relative h-64 w-full md:h-auto md:w-3/5">
          <Skeleton className="h-full w-full rounded-none bg-zinc-800" />
        </div>

        {/* Content Section Skeleton */}
        <div className="flex w-full flex-col justify-center px-6 py-8 md:w-2/5 md:px-10 lg:px-16">
          {/* Category badge */}
          <Skeleton className="mb-4 h-6 w-24 bg-zinc-700" />

          {/* Title */}
          <Skeleton className="h-10 w-3/4 bg-zinc-700 sm:h-12" />

          {/* Description */}
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full bg-zinc-700" />
            <Skeleton className="h-4 w-5/6 bg-zinc-700" />
            <Skeleton className="h-4 w-4/6 bg-zinc-700" />
          </div>

          {/* Price */}
          <Skeleton className="mt-6 h-10 w-32 bg-zinc-700" />

          {/* Button */}
          <Skeleton className="mt-8 h-12 w-36 bg-zinc-700" />
        </div>
      </div>

      {/* Dot indicators skeleton */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6">
        <Skeleton className="h-2 w-6 rounded-full bg-zinc-700" />
        <Skeleton className="h-2 w-2 rounded-full bg-zinc-700" />
        <Skeleton className="h-2 w-2 rounded-full bg-zinc-700" />
      </div>
    </div>
  );
}