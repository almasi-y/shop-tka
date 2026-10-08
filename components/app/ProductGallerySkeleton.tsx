export function ProductGallerySkeleton() {
  return (
    <div className="space-y-4">
      <div className="aspect-4/3 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}
