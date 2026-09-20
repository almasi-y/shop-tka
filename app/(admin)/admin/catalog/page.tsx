"use client";

import { Suspense, useTransition } from "react";
import {
  useCreateDocument,
  useDocumentProjection,
  useDocuments,
  useEditDocument,
  useQuery,
  type DocumentHandle,
} from "@sanity/sdk-react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteButton } from "@/components/admin/DeleteButton";
import {
  PublishButton,
  RevertButton,
} from "@/components/admin/PublishButton";

function CategoryOption({ handle }: { handle: DocumentHandle }) {
  const { data } = useDocumentProjection<{ title: string | null }>({
    ...handle,
    projection: `{ title }`,
  });

  return (
    <SelectItem value={handle.documentId}>
      {data?.title ?? "Untitled category"}
    </SelectItem>
  );
}

function CategoryCard({
  handle,
  categoryHandles,
  excludedParentIds,
}: {
  handle: DocumentHandle;
  categoryHandles: DocumentHandle[];
  excludedParentIds: Set<string>;
}) {
  const { data } = useDocumentProjection<{
    title: string | null;
    slug: string | null;
    parentId: string | null;
  }>({
    ...handle,
    projection: `{ title, "slug": slug.current, "parentId": parentCategory._ref }`,
  });
  const editTitle = useEditDocument({ ...handle, path: "title" });
  const editSlug = useEditDocument({ ...handle, path: "slug" });
  const editParent = useEditDocument({ ...handle, path: "parentCategory" });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={data?.title ?? ""}
            onChange={(event) => editTitle(event.target.value)}
            placeholder="Category title"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            value={data?.slug ?? ""}
            onChange={(event) =>
              editSlug({ _type: "slug", current: event.target.value })
            }
            placeholder="category-slug"
          />
        </div>
        <div className="space-y-2">
          <Label>Parent category</Label>
          <Select
            value={data?.parentId ?? "__root__"}
            onValueChange={(documentId) =>
              editParent(
                documentId === "__root__"
                  ? undefined
                  : { _type: "reference", _ref: documentId },
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Top level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">Top level</SelectItem>
              {categoryHandles
                .filter(
                  (category) =>
                    !excludedParentIds.has(
                      normalizeDocumentId(category.documentId),
                    ),
                )
                .map((category) => (
                  <Suspense
                    key={category.documentId}
                    fallback={
                      <SelectItem value={category.documentId}>Loading…</SelectItem>
                    }
                  >
                    <CategoryOption handle={category} />
                  </Suspense>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <DeleteButton handle={handle} />
        <RevertButton {...handle} />
        <PublishButton {...handle} />
      </div>
    </div>
  );
}

type CategoryRelationship = {
  _id: string;
  parentId: string | null;
};

function normalizeDocumentId(documentId: string) {
  return documentId.replace(/^drafts\./, "");
}

function arrangeCategoryTree(
  handles: DocumentHandle[],
  relationships: CategoryRelationship[],
) {
  const handleById = new Map(
    handles.map((handle) => [normalizeDocumentId(handle.documentId), handle]),
  );
  const parentById = new Map<string, string | null>();
  for (const relationship of relationships) {
    parentById.set(
      normalizeDocumentId(relationship._id),
      relationship.parentId
        ? normalizeDocumentId(relationship.parentId)
        : null,
    );
  }

  const childrenByParent = new Map<string, string[]>();
  for (const documentId of handleById.keys()) {
    const parentId = parentById.get(documentId);
    if (!parentId || !handleById.has(parentId) || parentId === documentId) {
      continue;
    }
    const children = childrenByParent.get(parentId) ?? [];
    children.push(documentId);
    childrenByParent.set(parentId, children);
  }

  const arranged: Array<{
    handle: DocumentHandle;
    depth: number;
    excludedParentIds: Set<string>;
  }> = [];
  const visited = new Set<string>();

  const collectDescendants = (documentId: string) => {
    const descendants = new Set<string>([documentId]);
    const pending = [...(childrenByParent.get(documentId) ?? [])];
    while (pending.length > 0) {
      const childId = pending.pop()!;
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      pending.push(...(childrenByParent.get(childId) ?? []));
    }
    return descendants;
  };

  const visit = (documentId: string, depth: number) => {
    if (visited.has(documentId)) return;
    const handle = handleById.get(documentId);
    if (!handle) return;
    visited.add(documentId);
    arranged.push({
      handle,
      depth,
      excludedParentIds: collectDescendants(documentId),
    });
    for (const childId of childrenByParent.get(documentId) ?? []) {
      visit(childId, depth + 1);
    }
  };

  for (const documentId of handleById.keys()) {
    const parentId = parentById.get(documentId);
    if (!parentId || !handleById.has(parentId) || parentId === documentId) {
      visit(documentId, 0);
    }
  }

  // Malformed historical cycles remain editable instead of disappearing.
  for (const documentId of handleById.keys()) {
    visit(documentId, 0);
  }

  return arranged;
}

function BrandCard({ handle }: { handle: DocumentHandle }) {
  const { data } = useDocumentProjection<{
    title: string | null;
    slug: string | null;
  }>({
    ...handle,
    projection: `{ title, "slug": slug.current }`,
  });
  const editTitle = useEditDocument({ ...handle, path: "title" });
  const editSlug = useEditDocument({ ...handle, path: "slug" });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={data?.title ?? ""}
            onChange={(event) => editTitle(event.target.value)}
            placeholder="Brand title"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            value={data?.slug ?? ""}
            onChange={(event) =>
              editSlug({ _type: "slug", current: event.target.value })
            }
            placeholder="brand-slug"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <DeleteButton handle={handle} />
        <RevertButton {...handle} />
        <PublishButton {...handle} />
      </div>
    </div>
  );
}

function CatalogContent() {
  const { data: categories } = useDocuments({
    documentType: "category",
    orderings: [{ field: "title", direction: "asc" }],
  });
  const { data: brands } = useDocuments({
    documentType: "brand",
    orderings: [{ field: "title", direction: "asc" }],
  });
  const { data: categoryRelationships } = useQuery<CategoryRelationship[]>({
    query: `*[_type == "category"]{_id, "parentId": parentCategory._ref}`,
    perspective: "drafts",
  });
  const createCategory = useCreateDocument({ documentType: "category" });
  const createBrand = useCreateDocument({ documentType: "brand" });
  const [isPending, startTransition] = useTransition();
  const arrangedCategories = arrangeCategoryTree(
    categories,
    categoryRelationships,
  );

  return (
    <Tabs defaultValue="categories" className="space-y-6">
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="brands">Brands</TabsTrigger>
      </TabsList>

      <TabsContent value="categories" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Assign a parent to build a category tree of any depth.
          </p>
          <Button
            disabled={isPending}
            onClick={() => startTransition(async () => void (await createCategory()))}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New Category
          </Button>
        </div>
        {arrangedCategories.map(({ handle, depth, excludedParentIds }) => (
          <div
            key={handle.documentId}
            className={depth > 0 ? "border-l border-zinc-200 pl-3 dark:border-zinc-800" : undefined}
            style={{ marginLeft: `${depth * 16}px` }}
          >
            <Suspense fallback={<Skeleton className="h-44 rounded-xl" />}>
              <CategoryCard
                handle={handle}
                categoryHandles={categories}
                excludedParentIds={excludedParentIds}
              />
            </Suspense>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="brands" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Brands appear automatically in storefront filters.
          </p>
          <Button
            disabled={isPending}
            onClick={() => startTransition(async () => void (await createBrand()))}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New Brand
          </Button>
        </div>
        {brands.map((handle) => (
          <Suspense
            key={handle.documentId}
            fallback={<Skeleton className="h-36 rounded-xl" />}
          >
            <BrandCard handle={handle} />
          </Suspense>
        ))}
      </TabsContent>
    </Tabs>
  );
}

export default function CatalogAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Catalog
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage nested categories and product brands.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <CatalogContent />
      </Suspense>
    </div>
  );
}
