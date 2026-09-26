"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ALL_CATEGORIES_QUERY_RESULT } from "@/sanity.types";

type Category = ALL_CATEGORIES_QUERY_RESULT[number];

interface CategorySidebarProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
  selectedSlug: string;
  onSelect: (slug: string | null) => void;
}

function CategoryBranch({
  category,
  childrenByParent,
  selectedSlug,
  activePath,
  depth,
  onSelect,
}: {
  category: Category;
  childrenByParent: Map<string | null, Category[]>;
  selectedSlug: string;
  activePath: Set<string>;
  depth: number;
  onSelect: (slug: string | null) => void;
}) {
  const children = childrenByParent.get(category._id) ?? [];
  const [open, setOpen] = useState(activePath.has(category._id));
  const isSelected = category.slug === selectedSlug;

  return (
    <li>
      <div
        className={cn(
          "flex items-center rounded-md text-sm",
          isSelected
            ? "bg-brand/10 font-medium text-brand dark:bg-brand/20 dark:text-brand-light"
            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          type="button"
          onClick={() => onSelect(category.slug)}
          className="min-w-0 flex-1 px-2 py-1.5 text-left"
        >
          {category.title}
        </button>
        {children.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={`${open ? "Collapse" : "Expand"} ${category.title}`}
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {open && children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <CategoryBranch
              key={child._id}
              category={child}
              childrenByParent={childrenByParent}
              selectedSlug={selectedSlug}
              activePath={activePath}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategorySidebar({
  categories,
  selectedSlug,
  onSelect,
}: CategorySidebarProps) {
  const childrenByParent = new Map<string | null, Category[]>();
  const categoryById = new Map(categories.map((category) => [category._id, category]));

  for (const category of categories) {
    const parentId = category.parentId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(parentId, siblings);
  }

  const activePath = new Set<string>();
  let current = categories.find((category) => category.slug === selectedSlug);
  while (current && !activePath.has(current._id)) {
    activePath.add(current._id);
    current = current.parentId ? categoryById.get(current.parentId) : undefined;
  }

  return (
    <ul className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
      <li>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-left text-sm",
            !selectedSlug
              ? "bg-brand/10 font-medium text-brand dark:bg-brand/20 dark:text-brand-light"
              : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
          )}
        >
          All Categories
        </button>
      </li>
      {(childrenByParent.get(null) ?? []).map((category) => (
        <CategoryBranch
          key={category._id}
          category={category}
          childrenByParent={childrenByParent}
          selectedSlug={selectedSlug}
          activePath={activePath}
          depth={0}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
