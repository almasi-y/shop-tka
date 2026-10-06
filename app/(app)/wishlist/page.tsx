import { auth } from "@clerk/nextjs/server";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/app/ProductCard";
import { WishlistRemoveButton } from "@/components/app/WishlistRemoveButton";
import { EmptyState } from "@/components/ui/empty-state";
import { WISHLIST_BY_USER_QUERY } from "@/lib/sanity/queries/wishlist";
import { serverReadClient } from "@/sanity/lib/server-client";

export const metadata = {
  title: "Your Wishlist | Code Innovators Shop",
  description: "View products saved to your wishlist",
};

export default async function WishlistPage() {
  const { userId } = await auth.protect();
  const wishlistItems = await serverReadClient.fetch(WISHLIST_BY_USER_QUERY, {
    clerkUserId: userId,
  });
  const items = wishlistItems.filter(
    (item): item is typeof item & {
      product: NonNullable<typeof item.product>;
    } => Boolean(item.product),
  );

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save products you would like to find again later."
          action={{ label: "Browse Products", href: "/" }}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Your Wishlist
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Products you have saved for later
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item._id} className="relative min-w-0">
            <WishlistRemoveButton productId={item.product._id} />
            <ProductCard product={item.product} />
          </div>
        ))}
      </div>
    </div>
  );
}
