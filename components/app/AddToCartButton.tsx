"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { RestockNotificationButton } from "@/components/app/RestockNotificationButton";
import { Button } from "@/components/ui/button";
import {
  useCartActions,
  useCartItem,
  useCartReady,
} from "@/lib/store/cart-store-provider";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  className?: string;
  enableRestockNotification?: boolean;
}

export function AddToCartButton({
  productId,
  slug,
  name,
  price,
  image,
  stock,
  className,
  enableRestockNotification = false,
}: AddToCartButtonProps) {
  const { addItem, updateQuantity } = useCartActions();
  const { isLoaded, isSignedIn } = useAuth();
  const isCartReady = useCartReady();
  const cartItem = useCartItem(productId);

  const quantityInCart = cartItem?.quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const isAtMax = quantityInCart >= stock;

  const handleAdd = () => {
    if (quantityInCart < stock) {
      addItem({ productId, slug, name, price, image }, 1);
      toast.success(`Added ${name}`);
    }
  };

  const handleDecrement = () => {
    if (quantityInCart > 0) {
      updateQuantity(productId, quantityInCart - 1);
    }
  };

  // Out of stock
  if (isOutOfStock) {
    if (enableRestockNotification) {
      return (
        <RestockNotificationButton
          productId={productId}
          name={name}
          className={className}
        />
      );
    }

    return (
      <Button
        disabled
        variant="secondary"
        className={cn("h-11 w-full", className)}
      >
        Out of Stock
      </Button>
    );
  }

  // Not in cart - show Add to Basket button
  if (quantityInCart === 0) {
    const addButton = (
      <Button
        onClick={isSignedIn ? handleAdd : undefined}
        disabled={!isLoaded || (Boolean(isSignedIn) && !isCartReady)}
        className={cn("h-11 w-full max-sm:[&_svg]:hidden", className)}
      >
        <ShoppingBag className="mr-2 h-4 w-4" />
        Add to Basket
      </Button>
    );

    if (!isLoaded || isSignedIn) return addButton;

    return (
      <SignInButton mode="modal" withSignUp>
        {addButton}
      </SignInButton>
    );
  }

  // In cart - show quantity controls
  return (
    <div
      className={cn(
        "grid h-11 w-full grid-cols-[2.75rem_1fr_2.75rem] items-center overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-full w-full rounded-r-none"
        onClick={handleDecrement}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-full text-center text-sm font-semibold tabular-nums">
        {quantityInCart}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-full w-full rounded-l-none disabled:opacity-20"
        onClick={handleAdd}
        disabled={isAtMax}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
