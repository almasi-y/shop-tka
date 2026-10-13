"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartItems } from "@/lib/store/cart-store-provider";
import type { ShippingAddressForm } from "@/lib/checkout/shipping-address";

interface CheckoutButtonProps {
  disabled?: boolean;
  isAddressComplete: boolean;
  shippingAddress: ShippingAddressForm;
  shippingFee: number;
}

export function CheckoutButton({
  disabled,
  isAddressComplete,
  shippingAddress,
  shippingFee,
}: CheckoutButtonProps) {
  const router = useRouter();
  const items = useCartItems();
  const [isPending, startTransition] = useTransition();

  const handleCheckout = () => {
    if (!isAddressComplete) {
      toast.error("Complete your shipping details", {
        description:
          "Enter your full name, address, city and county before continuing.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            shippingAddress,
            expectedShippingFee: shippingFee,
          }),
        });
        const result = await response.json();

        if (response.ok && result.authorizationUrl) {
          router.push(result.authorizationUrl);
          return;
        }

        toast.error("Checkout error", {
          description: result.error ?? "Something went wrong.",
        });
      } catch (checkoutError) {
        console.error("Checkout request failed", checkoutError);
        toast.error("Checkout error", {
          description: "Unable to start checkout. Please try again.",
        });
      }
    });
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || isPending || items.length === 0}
      size="lg"
      className="w-full"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-5 w-5" />
          Proceed to Checkout
        </>
      )}
    </Button>
  );
}
