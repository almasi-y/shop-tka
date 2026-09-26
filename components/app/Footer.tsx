import { Footer as FooterSection } from "@/components/ui/footer-section";
import type { FooterLink } from "@/components/ui/footer-section";
import { ALL_BRANDS_QUERY } from "@/lib/sanity/queries/brands";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { sanityFetch } from "@/sanity/lib/live";

const MAX_FOOTER_CATEGORIES = 6;

export async function Footer() {
  const [{ data: categories }, { data: brands }] = await Promise.all([
    sanityFetch({ query: ALL_CATEGORIES_QUERY }),
    sanityFetch({ query: ALL_BRANDS_QUERY }),
  ]);

  const categoryLinks: FooterLink[] = categories
    .filter((category) => !category.parentId && category.title && category.slug)
    .slice(0, MAX_FOOTER_CATEGORIES)
    .map((category) => ({
      title: category.title!,
      href: "/category/" + category.slug,
    }));

  const brandLinks: FooterLink[] = brands
    .filter((brand) => brand.title && brand.slug)
    .map((brand) => ({
      title: brand.title!,
      href: "/?brand=" + encodeURIComponent(brand.slug!),
    }));

  return <FooterSection categories={categoryLinks} brands={brandLinks} />;
}
