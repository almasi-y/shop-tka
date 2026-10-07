"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RETURN_REASONS, RETURN_RESOLUTIONS } from "@/lib/returns/constants";

export type ReturnFormItem = {
  productId: string;
  productName: string;
  remainingQuantity: number;
  returnEligibility: "standard" | "defects_only";
  returnWindowDays: 7 | 14;
  deadline: string;
  policyNote?: string;
};

export function ReturnRequestForm({
  orderId,
  items,
}: {
  orderId: string;
  items: ReturnFormItem[];
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [resolution, setResolution] = useState("refund");
  const [reason, setReason] = useState("damaged");
  const [notes, setNotes] = useState("");
  const [packagingConfirmed, setPackagingConfirmed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = useMemo(
    () =>
      items.flatMap((item) => {
        const quantity = quantities[item.productId] ?? 0;
        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    [items, quantities],
  );
  const defectsOnlySelected = selectedItems.some(
    (item) => item.returnEligibility === "defects_only",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedItems.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    if (defectsOnlySelected && reason === "other") {
      toast.error("Choose an eligible defect reason for the selected item");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set(
        "payload",
        JSON.stringify({
          orderId,
          resolution,
          reason,
          notes,
          packagingConfirmed,
          items: selectedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      );
      files.forEach((file) => formData.append("evidence", file));

      const response = await fetch("/api/returns", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        requestNumber?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Unable to submit request");

      toast.success(`Return ${result.requestNumber ?? "request"} submitted`);
      setQuantities({});
      setNotes("");
      setFiles([]);
      setPackagingConfirmed(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to submit request",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-5 border-t pt-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Select items and quantities</legend>
        {items.map((item) => (
          <div
            key={item.productId}
            className="grid gap-2 rounded-lg border bg-zinc-50 p-3 sm:grid-cols-[1fr_7rem] sm:items-center dark:bg-zinc-900/50"
          >
            <div>
              <p className="font-medium">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                Up to {item.remainingQuantity} available · {item.returnWindowDays}-day window · deadline {new Date(item.deadline).toLocaleDateString("en-KE")}
              </p>
              {item.policyNote && (
                <p className="mt-1 text-xs text-muted-foreground">{item.policyNote}</p>
              )}
            </div>
            <div>
              <Label htmlFor={`${orderId}-${item.productId}`} className="sr-only">
                Quantity for {item.productName}
              </Label>
              <Input
                id={`${orderId}-${item.productId}`}
                type="number"
                min={0}
                max={item.remainingQuantity}
                value={quantities[item.productId] ?? 0}
                onChange={(event) =>
                  setQuantities((current) => ({
                    ...current,
                    [item.productId]: Math.max(
                      0,
                      Math.min(item.remainingQuantity, Number(event.target.value) || 0),
                    ),
                  }))
                }
              />
            </div>
          </div>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${orderId}-resolution`}>Preferred resolution</Label>
          <select
            id={`${orderId}-resolution`}
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {RETURN_RESOLUTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${orderId}-reason`}>Reason</Label>
          <select
            id={`${orderId}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {RETURN_REASONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={defectsOnlySelected && option.value === "other"}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${orderId}-notes`}>What went wrong?</Label>
        <Textarea
          id={`${orderId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          minLength={5}
          maxLength={1000}
          required
          placeholder="Describe the issue and the condition of the item."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${orderId}-evidence`}>
          Evidence photos {reason === "damaged" || reason === "faulty" ? "(required)" : "(optional)"}
        </Label>
        <Input
          id={`${orderId}-evidence`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required={reason === "damaged" || reason === "faulty"}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
        />
        <p className="text-xs text-muted-foreground">Up to 3 JPG, PNG, or WebP photos, 5 MB each.</p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={packagingConfirmed}
          onChange={(event) => setPackagingConfirmed(event.target.checked)}
          required
          className="mt-0.5 size-4 accent-brand-purple"
        />
        <span>I will return the item in its original packaging with all accessories, manuals, and included gifts.</span>
      </label>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Submit for admin review
      </Button>
    </form>
  );
}

