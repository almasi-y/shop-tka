import { Skeleton } from "@/components/ui/skeleton";

export function StoreCategoryNavigationSkeleton() {
  return (
    <>
      <Skeleton className="h-11 w-full rounded-lg lg:hidden" />
      <div className="hidden max-h-[500px] overflow-hidden rounded-xl border border-zinc-200 bg-white lg:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="h-12 bg-brand" />
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="flex h-11 items-center px-4">
              <Skeleton className="h-4 w-full max-w-40" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
