import { ProductGridSkeleton } from "@/components/app/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64 max-w-full" />
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
