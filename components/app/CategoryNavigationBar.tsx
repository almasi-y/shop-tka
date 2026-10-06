import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { sanityFetch } from "@/sanity/lib/live";

export async function CategoryNavigationBar() {
  let categories;

  try {
    const result = await sanityFetch({ query: ALL_CATEGORIES_QUERY });
    categories = result.data;
  } catch (error) {
    console.error("Unable to load category navigation", error);
    return null;
  }

  const topLevelCategories = categories.filter(
    (category) => !category.parentId && category.title && category.slug,
  );

  if (topLevelCategories.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <nav
        aria-label="Store categories"
        className="mx-auto flex min-h-11 max-w-7xl items-center overflow-x-auto px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 border-r border-zinc-200 pr-5 text-sm font-semibold text-brand-night transition-colors hover:text-brand-periwinkle dark:border-zinc-800 dark:text-brand-periwinkle-soft"
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          All Categories
        </Link>
        <ul className="flex min-w-max items-center">
          {topLevelCategories.map((category) => (
            <li key={category._id}>
              <Link
                href={`/category/${category.slug}`}
                className="inline-flex min-h-11 items-center px-4 text-sm font-medium whitespace-nowrap text-zinc-700 transition-colors hover:bg-brand-mist hover:text-brand-night dark:text-zinc-300 dark:hover:bg-brand-night/40 dark:hover:text-brand-periwinkle-soft"
              >
                {category.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
