import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      <div className="mb-8 space-y-3 rounded-xl border p-5">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <section className="mb-10 space-y-4">
        <Skeleton className="h-7 w-36" />
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-28 w-full" />
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex justify-between gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>
    </div>
  );
}
