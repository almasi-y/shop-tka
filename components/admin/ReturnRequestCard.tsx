"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import {
  useClient,
  useDocumentProjection,
  type DocumentHandle,
} from "@sanity/sdk-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  RETURN_STATUSES,
  getReturnReasonLabel,
  getReturnResolutionLabel,
  getReturnStatusLabel,
} from "@/lib/returns/constants";

type ReturnProjection = {
  requestNumber: string;
  customerEmail: string;
  orderNumber: string;
  resolution: string;
  reason: string;
  notes: string;
  status: string;
  adminNotes?: string;
  requestedAt: string;
  packagingConfirmed: boolean;
  items: Array<{ _key: string; productName: string; quantity: number }>;
  evidenceImageUrls?: string[];
};

function ReturnReviewControls({
  handle,
  initialStatus,
  initialAdminNotes,
}: {
  handle: DocumentHandle;
  initialStatus: string;
  initialAdminNotes: string;
}) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const [status, setStatus] = useState(initialStatus);
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes);
  const [isSaving, setIsSaving] = useState(false);

  async function saveReview() {
    if (status === "rejected" && adminNotes.trim().length < 5) {
      toast.error("Add a clear customer-facing reason before rejecting the request");
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const fields: Record<string, string> = { status, adminNotes };
      if (status === "approved" || status === "rejected") {
        fields.reviewedAt = now;
      }
      if (status === "completed") fields.completedAt = now;

      await client.patch(handle.documentId).set(fields).commit();
      toast.success("Return request updated");
    } catch (error) {
      console.error("Return review update failed", error);
      toast.error("Unable to update the return request");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${handle.documentId}-status`} className="text-sm font-medium">Review status</label>
        <select
          id={`${handle.documentId}-status`}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {RETURN_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${handle.documentId}-notes`} className="text-sm font-medium">Customer-visible update</label>
        <Textarea
          id={`${handle.documentId}-notes`}
          value={adminNotes}
          onChange={(event) => setAdminNotes(event.target.value)}
          maxLength={1000}
          placeholder="Add inspection results or next steps for the customer."
          className="mt-1"
        />
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Approving this request does not issue a Paystack refund. Process any approved refund manually, then mark the request completed.
      </p>
      <Button onClick={saveReview} disabled={isSaving}>
        {isSaving && <Loader2 className="animate-spin" />}
        Save review
      </Button>
    </div>
  );
}

function ReturnRequestCardContent(handle: DocumentHandle) {
  const { data } = useDocumentProjection<ReturnProjection>({
    ...handle,
    projection: `{
      requestNumber,
      customerEmail,
      "orderNumber": order->orderNumber,
      resolution,
      reason,
      notes,
      status,
      adminNotes,
      requestedAt,
      packagingConfirmed,
      items[]{_key, productName, quantity},
      "evidenceImageUrls": evidenceImages[].asset->url
    }`,
  });
  if (!data) return null;

  return (
    <article className="rounded-xl border bg-white p-5 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{data.requestNumber}</h2>
          <p className="text-sm text-muted-foreground">
            Order #{data.orderNumber} · {data.customerEmail}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(data.requestedAt).toLocaleString("en-KE")}
          </p>
        </div>
        <Badge variant="secondary">{getReturnStatusLabel(data.status)}</Badge>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm">
          <p><span className="font-medium">Requested:</span> {getReturnResolutionLabel(data.resolution)}</p>
          <p><span className="font-medium">Reason:</span> {getReturnReasonLabel(data.reason)}</p>
          <p><span className="font-medium">Customer notes:</span> {data.notes}</p>
          <p><span className="font-medium">Packaging confirmed:</span> {data.packagingConfirmed ? "Yes" : "No"}</p>
          <ul className="rounded-lg bg-muted p-3">
            {data.items.map((item) => (
              <li key={item._key}>{item.quantity} × {item.productName}</li>
            ))}
          </ul>
          {(data.evidenceImageUrls?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.evidenceImageUrls?.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <Image
                    src={url}
                    alt="Customer return evidence"
                    width={96}
                    height={96}
                    className="size-24 rounded-lg border object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <ReturnReviewControls
          key={`${data.status}-${data.adminNotes ?? ""}`}
          handle={handle}
          initialStatus={data.status ?? "pending"}
          initialAdminNotes={data.adminNotes ?? ""}
        />
      </div>
    </article>
  );
}

export function ReturnRequestCard(handle: DocumentHandle) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
      <ReturnRequestCardContent {...handle} />
    </Suspense>
  );
}
