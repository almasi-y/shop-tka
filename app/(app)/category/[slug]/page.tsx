import { notFound } from "next/navigation";
import { CatalogPage, type CatalogSearchParams } from "../../page";
import { CATEGORY_BY_SLUG_QUERY } from "@/lib/sanity/queries/categories";
import { client } from "@/sanity/lib/client";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await client.fetch(CATEGORY_BY_SLUG_QUERY, { slug });

  return {
    title: category?.title
      ? `${category.title} | TechKidz Africa`
      : "Category | TechKidz Africa",
    description:
      category?.title ? `Shop ${category.title} products` : "Shop robotics products",
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const category = await client.fetch(CATEGORY_BY_SLUG_QUERY, { slug });
  if (!category) notFound();

  return (
    <CatalogPage
      searchParams={searchParams}
      categorySlugOverride={category.slug ?? slug}
    />
  );
}
