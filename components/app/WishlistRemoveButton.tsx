"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { notifyWishlistUpdated } from "@/lib/wishlist/events";

export function WishlistRemoveButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);

  async function removeItem() {
    setIsRemoving(true);
    try {
      const response = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to remove product");
      }

      notifyWishlistUpdated();
      toast.success("Removed from your wishlist");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove product",
      );
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="absolute right-2 top-2 z-10 rounded-full shadow-sm"
      onClick={removeItem}
      disabled={isRemoving}
      aria-label="Remove from wishlist"
    >
      {isRemoving ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <X aria-hidden="true" />
      )}
    </Button>
  );
}
