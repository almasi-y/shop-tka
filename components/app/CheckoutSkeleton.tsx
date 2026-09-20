export function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 h-9 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="h-96 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 lg:col-span-3" />
        <div className="h-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 lg:col-span-2" />
      </div>
    </div>
  );
}