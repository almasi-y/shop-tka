import { FeaturedCarouselSkeleton } from "./FeaturedCarouselSkeleton";
import { ProductFiltersSkeleton } from "./ProductFiltersSkeleton";
import { ProductGridSkeleton } from "@/components/app/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function CatalogPageSkeleton({
  showCarousel = false,
}: {
  showCarousel?: boolean;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="hidden lg:block">
          <ProductFiltersSkeleton />
        </aside>

        <main className="min-w-0 space-y-6">
          {showCarousel && (
            <div className="overflow-hidden">
              <FeaturedCarouselSkeleton />
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-9 w-24 lg:hidden" />
          </div>
          <ProductGridSkeleton />
        </main>
      </div>
    </div>
  );
}
