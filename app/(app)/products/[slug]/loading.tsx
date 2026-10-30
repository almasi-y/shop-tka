import { Skeleton } from "@/components/ui/skeleton";
import { ProductGallerySkeleton } from "@/components/app/ProductGallerySkeleton";
import { ProductInfoSkeleton } from "@/components/app/ProductInfoSkeleton";

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-72 max-w-full" />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(24rem,2fr)_minmax(0,3fr)] lg:gap-10 xl:grid-cols-[minmax(30rem,5fr)_minmax(0,7fr)]">
          <div className="lg:sticky lg:top-14 lg:h-fit lg:self-start">
            <ProductGallerySkeleton />
          </div>

          <ProductInfoSkeleton />
        </div>
      </div>
    </div>
  );
}
