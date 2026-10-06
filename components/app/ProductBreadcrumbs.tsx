import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface BreadcrumbCategory {
  title: string | null;
  slug: string | null;
  parent?: BreadcrumbCategory | null;
}

interface ProductBreadcrumbsProps {
  category: BreadcrumbCategory | null;
  productName: string | null;
}

function getCategoryPath(category: BreadcrumbCategory | null) {
  const path: BreadcrumbCategory[] = [];
  const visited = new Set<string>();
  let current = category;

  while (current) {
    const key = current.slug ?? current.title;
    if (!key || visited.has(key)) break;

    visited.add(key);
    path.unshift(current);
    current = current.parent ?? null;
  }

  return path;
}

export function ProductBreadcrumbs({
  category,
  productName,
}: ProductBreadcrumbsProps) {
  const categoryPath = getCategoryPath(category);

  return (
    <nav aria-label="Breadcrumb" className="mb-6 overflow-hidden">
      <ol className="flex items-center gap-1.5 overflow-x-auto text-sm text-zinc-500 dark:text-zinc-400">
        <li className="shrink-0">
          <Link
            href="/"
            className="transition-colors hover:text-brand-night dark:hover:text-brand-periwinkle-soft"
          >
            Home
          </Link>
        </li>
        {categoryPath.map((item) => (
          <li
            key={item.slug ?? item.title}
            className="flex shrink-0 items-center gap-1.5"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            {item.slug ? (
              <Link
                href={`/category/${item.slug}`}
                className="transition-colors hover:text-brand-night dark:hover:text-brand-periwinkle-soft"
              >
                {item.title}
              </Link>
            ) : (
              <span>{item.title}</span>
            )}
          </li>
        ))}
        {productName && (
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronLeft className="size-3.5 shrink-0" aria-hidden="true" />
            <span
              className="truncate font-medium text-zinc-900 dark:text-zinc-100"
              aria-current="page"
            >
              {productName}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
