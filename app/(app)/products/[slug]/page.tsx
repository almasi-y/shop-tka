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
      <div className="mx-auto max-w-6xl px-2 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ProductBreadcrumbs
          category={product.category}
          productName={product.name}
        />
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-start gap-3 sm:gap-6 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-10">
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
