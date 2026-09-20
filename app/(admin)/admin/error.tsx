"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route failed", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Admin page unavailable
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        The page could not be loaded. Your content has not been changed.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
