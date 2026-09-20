"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useCartActions } from "@/lib/store/cart-store-provider";

interface SuccessClientProps {
  reference: string | null;
}

type ConfirmationState = "checking" | "confirmed" | "pending" | "error";

export function SuccessClient({ reference }: SuccessClientProps) {
  const { clearCart } = useCartActions();
  const [state, setState] = useState<ConfirmationState>(
    reference ? "checking" : "error",
  );

  useEffect(() => {
    if (!reference) return;

    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const checkOrder = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/checkout/status?reference=${encodeURIComponent(reference)}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as {
          confirmed?: boolean;
        };

        if (cancelled) return;
        if (response.ok && result.confirmed) {
          clearCart();
          setState("confirmed");
          return;
        }
        if (!response.ok) {
          setState("error");
          return;
        }

        if (attempts < 15) {
          setState("checking");
          timeoutId = setTimeout(checkOrder, 2_000);
        } else {
          setState("pending");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    };

    void checkOrder();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [clearCart, reference]);

  const content = {
    checking: {
      icon: <Loader2 className="mx-auto h-16 w-16 animate-spin text-amber-500" />,
      title: "Confirming Payment",
      message: "Paystack is confirming your payment and creating your order.",
    },
    confirmed: {
      icon: <CheckCircle className="mx-auto h-16 w-16 text-green-500" />,
      title: "Order Confirmed!",
      message: "Your payment was confirmed and your order is now available.",
    },
    pending: {
      icon: <Loader2 className="mx-auto h-16 w-16 text-amber-500" />,
      title: "Confirmation Pending",
      message:
        "Payment confirmation is taking longer than expected. Keep your cart for now and check your orders shortly.",
    },
    error: {
      icon: <AlertCircle className="mx-auto h-16 w-16 text-red-500" />,
      title: "Unable to Confirm Payment",
      message:
        "We could not confirm this payment yet. Your cart has not been cleared.",
    },
  }[state];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
      {content.icon}
      <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
        {content.title}
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {content.message}
      </p>
      {reference && (
        <p className="mt-4 text-sm text-zinc-500">Reference: {reference}</p>
      )}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/orders" className={buttonVariants({ variant: "outline" })}>
          View Your Orders
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        <Link href="/" className={buttonVariants()}>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
