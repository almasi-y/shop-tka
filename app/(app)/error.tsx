"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Store route failed", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-brand" />
      <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Something went wrong
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        We could not load this part of the store. You can retry or return to
        the catalog.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to store
        </Link>
      </div>
    </div>
  );
}
