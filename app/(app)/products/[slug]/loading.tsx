import { Skeleton } from "@/components/ui/skeleton";
import { ProductGallerySkeleton } from "@/components/app/ProductGallerySkeleton";
import { ProductInfoSkeleton } from "@/components/app/ProductInfoSkeleton";

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-72 max-w-full" />
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-14 lg:h-fit lg:self-start">
            <ProductGallerySkeleton />
          </div>

          <ProductInfoSkeleton />
        </div>
      </div>
    </div>
  );
}