"use client";

import { Suspense, useState } from "react";
import { useDocuments } from "@sanity/sdk-react";
import { RotateCcw } from "lucide-react";
import { ReturnRequestCard } from "@/components/admin/ReturnRequestCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RETURN_STATUSES } from "@/lib/returns/constants";

function ReturnsList({ status }: { status: string }) {
  const { data, hasMore, loadMore, isPending } = useDocuments({
    documentType: "returnRequest",
    filter: status === "all" ? undefined : `status == "${status}"`,
    orderings: [{ field: "requestedAt", direction: "desc" }],
    batchSize: 20,
  });

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="No return requests"
        description={status === "all" ? "Customer requests will appear here." : `There are no ${status} requests.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.map((handle) => (
        <ReturnRequestCard key={handle.documentId} {...handle} />
      ))}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => loadMore()} disabled={isPending}>
            {isPending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminReturnsPage() {
  const [status, setStatus] = useState("all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Returns</h1>
        <p className="mt-1 text-muted-foreground">Review, inspect, and complete customer return requests.</p>
      </div>
      <div className="overflow-x-auto">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="w-max">
            <TabsTrigger value="all">All</TabsTrigger>
            {RETURN_STATUSES.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Suspense key={status} fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <ReturnsList status={status} />
      </Suspense>
    </div>
  );
}

