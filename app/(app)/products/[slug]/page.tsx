import { notFound, redirect } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/live";
import { PRODUCT_BY_SLUG_QUERY } from "@/lib/sanity/queries/products";
import { ProductGallery } from "@/components/app/ProductGallery";
import { ProductInfo } from "@/components/app/ProductInfo";
import { ProductBreadcrumbs } from "@/components/app/ProductBreadcrumbs";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const CANONICAL_PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const { data: product } = await sanityFetch({
    query: PRODUCT_BY_SLUG_QUERY,
    params: { identifier: slug },
  });

  if (!product) {
    notFound();
  }

  if (
    product.slug &&
    product.slug !== slug &&
    CANONICAL_PRODUCT_SLUG.test(product.slug)
  ) {
    redirect(`/products/${product.slug}`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductBreadcrumbs
          category={product.category}
          productName={product.name}
        />
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-14 lg:h-fit lg:self-start">
            <ProductGallery
              images={product.images}
              productName={product.name}
            />
          </div>

          <ProductInfo product={product} />
        </div>
      </div>
    </div>
  );
}
