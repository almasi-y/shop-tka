"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import {
  useDocument,
  useEditDocument,
  useDocumentProjection,
  useDocuments,
  type DocumentHandle,
} from "@sanity/sdk-react";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PublishButton,
  RevertButton,
} from "@/components/admin/PublishButton";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { DeleteButton } from "@/components/admin/DeleteButton";

// Field editor components
function NameEditor(handle: DocumentHandle) {
  const { data: name } = useDocument({ ...handle, path: "title" });
  const editName = useEditDocument({ ...handle, path: "title" });

  return (
    <Input
      value={(name as string) ?? ""}
      onChange={(e) => editName(e.target.value)}
      placeholder="Product name"
    />
  );
}

function SlugEditor(handle: DocumentHandle) {
  const { data: slug } = useDocument({ ...handle, path: "slug" });
  const editSlug = useEditDocument({ ...handle, path: "slug" });
  const slugValue = (slug as { current?: string })?.current ?? "";

  return (
    <Input
      value={slugValue}
      onChange={(e) => editSlug({ _type: "slug", current: e.target.value })}
      placeholder="product-slug"
    />
  );
}

function DescriptionEditor(handle: DocumentHandle) {
  const { data: description } = useDocument({ ...handle, path: "description" });
  const editDescription = useEditDocument({ ...handle, path: "description" });

  return (
    <Textarea
      value={(description as string) ?? ""}
      onChange={(e) => editDescription(e.target.value)}
      placeholder="Product description..."
      rows={8}
    />
  );
}

interface ProductFeatureValue {
  _key: string;
  _type: "productFeature";
  title: string;
  description: string;
}

function FeaturesEditor(handle: DocumentHandle) {
  const { data } = useDocument({ ...handle, path: "features" });
  const editFeatures = useEditDocument({ ...handle, path: "features" });
  const features = (data as ProductFeatureValue[] | null) ?? [];

  const updateFeature = (
    index: number,
    field: "title" | "description",
    value: string,
  ) => {
    editFeatures(
      features.map((feature, featureIndex) =>
        featureIndex === index ? { ...feature, [field]: value } : feature,
      ),
    );
  };

  const removeFeature = (index: number) => {
    const nextFeatures = features.filter(
      (_, featureIndex) => featureIndex !== index,
    );
    editFeatures(nextFeatures.length > 0 ? nextFeatures : undefined);
  };

  return (
    <div className="space-y-4">
      {features.map((feature, index) => (
        <div
          key={feature._key}
          className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Feature {index + 1}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-red-500"
              onClick={() => removeFeature(index)}
              aria-label={`Remove feature ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={feature.title}
            onChange={(event) =>
              updateFeature(index, "title", event.target.value)
            }
            placeholder="Feature title"
          />
          <Textarea
            value={feature.description}
            onChange={(event) =>
              updateFeature(index, "description", event.target.value)
            }
            placeholder="Describe this feature..."
            rows={4}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          editFeatures([
            ...features,
            {
              _key: crypto.randomUUID(),
              _type: "productFeature",
              title: "",
              description: "",
            },
          ])
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Feature
      </Button>
    </div>
  );
}

function PriceEditor(handle: DocumentHandle) {
  const { data: price } = useDocument({ ...handle, path: "price" });
  const editPrice = useEditDocument({ ...handle, path: "price" });

  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      value={(price as number) ?? ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        editPrice(parseFloat(e.target.value) || 0)
      }
      placeholder="0.00"
    />
  );
}

function StockEditor(handle: DocumentHandle) {
  const { data: stock } = useDocument({ ...handle, path: "stock" });
  const editStock = useEditDocument({ ...handle, path: "stock" });

  return (
    <Input
      type="number"
      min="0"
      value={(stock as number) ?? 0}
      onChange={(e) => editStock(parseInt(e.target.value) || 0)}
      placeholder="0"
    />
  );
}

function MaterialEditor(handle: DocumentHandle) {
  const { data: material } = useDocument({ ...handle, path: "material" });
  const editMaterial = useEditDocument({ ...handle, path: "material" });

  return (
    <Input
      value={(material as string) ?? ""}
      onChange={(event) => editMaterial(event.target.value)}
      placeholder="Optional material"
    />
  );
}

function ColorEditor(handle: DocumentHandle) {
  const { data: color } = useDocument({ ...handle, path: "color" });
  const editColor = useEditDocument({ ...handle, path: "color" });

  return (
    <Input
      value={(color as string) ?? ""}
      onChange={(event) => editColor(event.target.value)}
      placeholder="Optional color"
    />
  );
}

function SizeEditor(handle: DocumentHandle) {
  const { data: size } = useDocument({ ...handle, path: "size" });
  const editSize = useEditDocument({ ...handle, path: "size" });

  return (
    <Input
      value={(size as string) ?? ""}
      onChange={(event) => editSize(event.target.value)}
      placeholder="Optional size or variant"
    />
  );
}

function ReferenceOption({
  handle,
}: {
  handle: DocumentHandle;
}) {
  const { data } = useDocumentProjection<{ title: string | null }>({
    ...handle,
    projection: `{ title }`,
  });

  return (
    <SelectItem value={handle.documentId}>
      {data?.title ?? "Untitled"}
    </SelectItem>
  );
}

function ReferenceEditor({
  handle,
  field,
  documentType,
  placeholder,
  optional = false,
}: {
  handle: DocumentHandle;
  field: "category" | "brand";
  documentType: "category" | "brand";
  placeholder: string;
  optional?: boolean;
}) {
  const { data: reference } = useDocument({ ...handle, path: field });
  const editReference = useEditDocument({ ...handle, path: field });
  const { data: documents } = useDocuments({
    documentType,
    orderings: [{ field: "title", direction: "asc" }],
  });
  const referenceId = (reference as { _ref?: string } | null)?._ref;

  return (
    <Select
      value={referenceId ?? (optional ? "__none__" : "")}
      onValueChange={(documentId) =>
        editReference(
          documentId === "__none__"
            ? undefined
            : { _type: "reference", _ref: documentId },
        )
      }
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {optional && <SelectItem value="__none__">No brand</SelectItem>}
        {documents.map((documentHandle) => (
          <Suspense
            key={documentHandle.documentId}
            fallback={
              <SelectItem value={documentHandle.documentId}>Loading…</SelectItem>
            }
          >
            <ReferenceOption handle={documentHandle} />
          </Suspense>
        ))}
      </SelectContent>
    </Select>
  );
}

function DimensionsEditor(handle: DocumentHandle) {
  const { data: dimensions } = useDocument({ ...handle, path: "dimensions" });
  const editDimensions = useEditDocument({ ...handle, path: "dimensions" });

  return (
    <Input
      value={(dimensions as string) ?? ""}
      onChange={(e) => editDimensions(e.target.value)}
      placeholder='e.g., "120cm x 80cm x 75cm"'
    />
  );
}

function FeaturedEditor(handle: DocumentHandle) {
  const { data: featured } = useDocument({ ...handle, path: "featured" });
  const editFeatured = useEditDocument({ ...handle, path: "featured" });

  return (
    <Switch
      checked={(featured as boolean) ?? false}
      onCheckedChange={(checked: boolean) => editFeatured(checked)}
    />
  );
}

function AssemblyEditor(handle: DocumentHandle) {
  const { data: assemblyRequired } = useDocument({
    ...handle,
    path: "assemblyRequired",
  });
  const editAssembly = useEditDocument({
    ...handle,
    path: "assemblyRequired",
  });

  return (
    <Switch
      checked={(assemblyRequired as boolean) ?? false}
      onCheckedChange={(checked: boolean) => editAssembly(checked)}
    />
  );
}

interface ProductSlugProjection {
  slug: {
    current: string;
  } | null;
}

function ProductStoreLink(handle: DocumentHandle) {
  const { data } = useDocumentProjection<ProductSlugProjection>({
    ...handle,
    projection: `{ slug }`,
  });

  const slug = data?.slug?.current;

  if (!slug) return null;

  return (
    <Link
      href={`/products/${slug}`}
      target="_blank"
      className="flex items-center justify-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      View on store
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

function ProductDetailContent({ handle }: { handle: DocumentHandle }) {
  const { data: title } = useDocument({ ...handle, path: "title" });
  const { data: legacyName } = useDocument({ ...handle, path: "name" });
  const name = (title as string) || (legacyName as string);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            {(name as string) || "New Product"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Edit product details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DeleteButton handle={handle} />
          <Suspense fallback={null}>
            <RevertButton {...handle} />
          </Suspense>
          <Suspense fallback={null}>
            <PublishButton {...handle} />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Main Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <NameEditor {...handle} />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <SlugEditor {...handle} />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Suspense fallback={<Skeleton className="h-24" />}>
                  <DescriptionEditor {...handle} />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label>Features</Label>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Add titled features with detailed, multi-line descriptions.
                </p>
                <Suspense fallback={<Skeleton className="h-32" />}>
                  <FeaturesEditor {...handle} />
                </Suspense>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Suspense fallback={<Skeleton className="h-10" />}>
                    <ReferenceEditor
                      handle={handle}
                      field="category"
                      documentType="category"
                      placeholder="Select category"
                    />
                  </Suspense>
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Suspense fallback={<Skeleton className="h-10" />}>
                    <ReferenceEditor
                      handle={handle}
                      field="brand"
                      documentType="brand"
                      placeholder="Select brand"
                      optional
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              Pricing & Inventory
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (KSh)</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <PriceEditor {...handle} />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <StockEditor {...handle} />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              Attributes
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Material</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <MaterialEditor {...handle} />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <ColorEditor {...handle} />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <SizeEditor {...handle} />
                </Suspense>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dimensions</Label>
                <Suspense fallback={<Skeleton className="h-10" />}>
                  <DimensionsEditor {...handle} />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              Options
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Featured Product
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Show on homepage and promotions
                  </p>
                </div>
                <Suspense fallback={<Skeleton className="h-6 w-11" />}>
                  <FeaturedEditor {...handle} />
                </Suspense>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Assembly Required
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Customer will need to assemble
                  </p>
                </div>
                <Suspense fallback={<Skeleton className="h-6 w-11" />}>
                  <AssemblyEditor {...handle} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Image Upload */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              Product Images
            </h2>
            <ImageUploader {...handle} />
            <div className="mt-4">
              <Suspense fallback={null}>
                <ProductStoreLink {...handle} />
              </Suspense>
            </div>
          </div>

          {/* Studio Link */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Advanced Editing
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Set category and other options in Sanity Studio.
            </p>
            <Link
              href={`/studio/structure/product;${handle.documentId}`}
              target="_blank"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
            >
              Open in Studio
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-7 w-48 sm:h-8" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const handle: DocumentHandle = {
    documentId: id,
    documentType: "product",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/inventory"
        className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Inventory
      </Link>

      {/* Product Detail */}
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent handle={handle} />
      </Suspense>
    </div>
  );
}
