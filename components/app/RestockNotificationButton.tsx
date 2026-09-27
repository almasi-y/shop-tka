"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { Bell, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RestockNotificationButtonProps {
  productId: string;
  name: string;
  className?: string;
}

interface RestockResponse {
  code?: string;
  error?: string;
  subscribed?: boolean;
}

type RestockStatus =
  | "idle"
  | "checking"
  | "subscribing"
  | "subscribed"
  | "error";

export function RestockNotificationButton({
  productId,
  name,
  className,
}: RestockNotificationButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledReturn = useRef(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RestockStatus>("idle");
  const [error, setError] = useState("");

  const returnPath = `/products/${encodeURIComponent(productId)}?notify=restock`;

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeAfterConfirmation = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 2_000);
  }, [clearCloseTimer]);

  const subscribe = useCallback(async () => {
    setOpen(true);
    setStatus("subscribing");
    setError("");

    try {
      const response = await fetch("/api/restock-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const result = (await response.json()) as RestockResponse;

      if (!response.ok) {
        if (result.code === "IN_STOCK") {
          router.refresh();
        }
        throw new Error(result.error ?? "Unable to register your notification");
      }

      setStatus("subscribed");
      closeAfterConfirmation();
    } catch (subscriptionError) {
      setStatus("error");
      setError(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : "Unable to register your notification",
      );
    }
  }, [closeAfterConfirmation, productId, router]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      searchParams.get("notify") === "restock" ||
      handledReturn.current
    ) {
      return;
    }

    const controller = new AbortController();
    setStatus("checking");

    async function checkSubscription() {
      try {
        const response = await fetch(
          `/api/restock-subscriptions?productId=${encodeURIComponent(productId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as RestockResponse;

        if (!response.ok) {
          throw new Error(result.error);
        }
        setStatus(result.subscribed ? "subscribed" : "idle");
      } catch (lookupError) {
        if (!(lookupError instanceof DOMException && lookupError.name === "AbortError")) {
          setStatus("idle");
        }
      }
    }

    void checkSubscription();
    return () => controller.abort();
  }, [isLoaded, isSignedIn, productId, searchParams]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      searchParams.get("notify") !== "restock" ||
      handledReturn.current
    ) {
      return;
    }

    handledReturn.current = true;
    void subscribe().finally(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("notify");
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [isLoaded, isSignedIn, pathname, router, searchParams, subscribe]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      clearCloseTimer();
    } else if (status === "subscribed") {
      closeAfterConfirmation();
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      triggerId={triggerId}
    >
      <PopoverTrigger
        id={triggerId}
        render={
          <Button
            type="button"
            variant="secondary"
            className={cn("h-11 w-full", className)}
          />
        }
      >
        Out of Stock
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="space-y-4">
        {status === "checking" || status === "subscribing" ? (
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-brand" />
            <div>
              <PopoverTitle className="font-semibold text-foreground">
                {status === "checking" ? "Checking notification" : "Saving notification"}
              </PopoverTitle>
              <PopoverDescription className="mt-1 text-sm text-muted-foreground">
                This will only take a moment.
              </PopoverDescription>
            </div>
          </div>
        ) : status === "subscribed" ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" />
            <div>
              <PopoverTitle className="font-semibold text-foreground">
                You will be notified
              </PopoverTitle>
              <PopoverDescription className="mt-1 text-sm text-muted-foreground">
                We will notify you when {name} is back in stock.
              </PopoverDescription>
            </div>
          </div>
        ) : status === "error" ? (
          <>
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <PopoverTitle className="font-semibold text-foreground">
                  Notification not saved
                </PopoverTitle>
                <PopoverDescription className="mt-1 text-sm text-muted-foreground">
                  {error}
                </PopoverDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void subscribe()}>
                Try again
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 size-5 shrink-0 text-brand" />
              <div>
                <PopoverTitle className="font-semibold text-foreground">
                  {name} is out of stock
                </PopoverTitle>
                <PopoverDescription className="mt-1 text-sm text-muted-foreground">
                  Ask us to notify you when it is available again.
                </PopoverDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {isSignedIn ? (
                <Button className="flex-1" onClick={() => void subscribe()}>
                  Notify me
                </Button>
              ) : (
                <SignInButton
                  mode="redirect"
                  withSignUp
                  forceRedirectUrl={returnPath}
                  signUpForceRedirectUrl={returnPath}
                >
                  <Button className="flex-1">Sign in to get notified</Button>
                </SignInButton>
              )}
              <Button variant="outline" onClick={() => setOpen(false)}>
                Not now
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
