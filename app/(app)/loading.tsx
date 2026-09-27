import { FeaturedCarouselSkeleton } from "@/components/app/LandingPage/FeaturedCarouselSkeleton";
import { ProductFiltersSkeleton } from "@/components/app/LandingPage/ProductFiltersSkeleton";
import { ProductGridSkeleton } from "@/components/app/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="hidden lg:block">
          <ProductFiltersSkeleton />
        </aside>

        <main className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-xl">
            <FeaturedCarouselSkeleton />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-24 lg:hidden" />
          </div>
          <div>
            <ProductGridSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}