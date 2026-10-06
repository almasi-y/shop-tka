"use client";

import { useEffect, useState } from "react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  productName: string;
  className?: string;
}

export function WishlistButton({
  productId,
  productName,
  className,
}: WishlistButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const controller = new AbortController();
    void fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to check wishlist");
        return (await response.json()) as { wishlisted?: boolean };
      })
      .then((result) => setWishlisted(Boolean(result.wishlisted)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Wishlist status request failed", error);
      })

    return () => controller.abort();
  }, [isLoaded, isSignedIn, productId]);

  async function toggleWishlist() {
    const isWishlisted = Boolean(isSignedIn && wishlisted);
    const nextWishlisted = !isWishlisted;
    setIsSaving(true);

    try {
      const response = await fetch("/api/wishlist", {
        method: nextWishlisted ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const result = (await response.json()) as {
        error?: string;
        wishlisted?: boolean;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update wishlist");
      }

      setWishlisted(Boolean(result.wishlisted));
      toast.success(
        nextWishlisted
          ? `${productName} saved to your wishlist`
          : `${productName} removed from your wishlist`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update wishlist",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const isWishlisted = Boolean(isSignedIn && wishlisted);
  const button = (
    <Button
      type="button"
      variant="outline"
      className={cn("h-10 w-full", className)}
      disabled={!isLoaded || isSaving}
      aria-pressed={isSignedIn ? isWishlisted : undefined}
      onClick={isSignedIn ? toggleWishlist : undefined}
    >
      {isSaving ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Heart
          className={cn(isWishlisted && "fill-brand text-brand")}
          aria-hidden="true"
        />
      )}
      {isWishlisted ? "Saved to wishlist" : "Add to wishlist"}
    </Button>
  );

  if (!isLoaded || isSignedIn) return button;

  return (
    <SignInButton mode="modal" withSignUp>
      {button}
    </SignInButton>
  );
}
