import { Skeleton } from "@/components/ui/skeleton";

export default function AccountAddressLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
      </div>

      <div className="space-y-6 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
    </main>
  );
}
