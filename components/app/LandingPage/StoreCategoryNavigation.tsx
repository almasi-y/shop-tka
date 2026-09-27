"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ALL_CATEGORIES_QUERY_RESULT } from "@/sanity.types";

interface StoreCategoryNavigationProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
  activeCategory?: string;
}

function CategoryLinks({
  categories,
  activeCategory,
  onNavigate,
}: StoreCategoryNavigationProps & { onNavigate?: () => void }) {
  const categoryById = new Map(
    categories.map((category) => [category._id, category]),
  );
  const activePath = new Set<string>();
  let current = categories.find(
    (category) => category.slug === activeCategory,
  );

  while (current && !activePath.has(current._id)) {
    activePath.add(current._id);
    current = current.parentId
      ? categoryById.get(current.parentId)
      : undefined;
  }

  const topLevelCategories = categories.filter(
    (category) => !category.parentId && category.title && category.slug,
  );

  return (
    <nav aria-label="Product categories" className="min-h-0 overflow-y-auto">
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <li>
          <Link
            href="/"
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
              !activeCategory
                ? "bg-brand-purple-light/35 text-brand-purple dark:bg-brand-purple/25 dark:text-brand-purple-light"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            <span>All Products</span>
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </li>
        {topLevelCategories.map((category) => {
          const isActive = activePath.has(category._id);

          return (
            <li key={category._id}>
              <Link
                href={`/category/${category.slug}`}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-purple-light/35 text-brand-purple dark:bg-brand-purple/25 dark:text-brand-purple-light"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
                )}
              >
                <span className="min-w-0 leading-snug">{category.title}</span>
                <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function StoreCategoryNavigation({
  categories,
  activeCategory,
}: StoreCategoryNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setMobileOpen(true)}
        className="h-11 w-full justify-between border-brand-blue/25 bg-white lg:hidden dark:bg-zinc-950"
        aria-haspopup="dialog"
        aria-expanded={mobileOpen}
      >
        <span className="inline-flex items-center gap-2">
          <LayoutGrid className="size-4 text-brand-purple" />
          Categories
        </span>
        <ChevronRight className="size-4" />
      </Button>

      <aside className="hidden max-h-[500px] min-h-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:flex lg:flex-col dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex min-h-12 shrink-0 items-center gap-2 bg-brand-purple px-4 py-3 text-sm font-semibold text-white">
          <LayoutGrid className="size-4" aria-hidden="true" />
          All Categories
        </div>
        <CategoryLinks
          categories={categories}
          activeCategory={activeCategory}
        />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-[80] flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-categories-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileOpen(false)}
            aria-label="Close categories"
          />
          <div className="relative flex h-full w-[min(88vw,22rem)] flex-col bg-white shadow-2xl dark:bg-zinc-950">
            <div className="flex min-h-14 shrink-0 items-center justify-between bg-brand-purple px-4 text-white">
              <h2
                id="mobile-categories-title"
                className="inline-flex items-center gap-2 font-semibold"
              >
                <LayoutGrid className="size-4" aria-hidden="true" />
                Categories
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close categories"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </Button>
            </div>
            <CategoryLinks
              categories={categories}
              activeCategory={activeCategory}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
