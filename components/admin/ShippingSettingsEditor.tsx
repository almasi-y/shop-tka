"use client";

import { Suspense, useState } from "react";
import {
  createDocument,
  publishDocument,
  useApplyDocumentActions,
  useDocument,
  useEditDocument,
  type DocumentHandle,
} from "@sanity/sdk-react";
import { Check, Loader2, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_SHIPPING_RATES } from "@/lib/shipping/kenya";

const SETTINGS_HANDLE: DocumentHandle = {
  documentId: "shippingSettings",
  documentType: "shippingSettings",
};

const RATE_FIELDS = [
  {
    field: "mombasaFee",
    label: "Mombasa County",
    description: "Mombasa",
  },
  {
    field: "coastalFee",
    label: "Coastal counties",
    description: "Kilifi, Kwale, Lamu, Taita-Taveta and Tana River",
  },
  {
    field: "nairobiFee",
    label: "Nairobi County",
    description: "Nairobi",
  },
  {
    field: "otherKenyaFee",
    label: "Other Kenyan counties",
    description: "All remaining counties, including Kisumu and Turkana",
  },
] as const;

function RateField({
  field,
  label,
  description,
}: (typeof RATE_FIELDS)[number]) {
  const { data: value } = useDocument({ ...SETTINGS_HANDLE, path: field });
  const editRate = useEditDocument({ ...SETTINGS_HANDLE, path: field });

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <Label htmlFor={field} className="font-medium">
        {label}
      </Label>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-500">KSh</span>
        <Input
          id={field}
          type="number"
          min={0}
          step={1}
          value={(value as number | undefined) ?? 0}
          onChange={(event) =>
            editRate(Math.max(0, Math.round(Number(event.target.value) || 0)))
          }
          className="max-w-48"
        />
      </div>
    </div>
  );
}

function ShippingSettingsContent() {
  const { data: settings } = useDocument(SETTINGS_HANDLE);
  const apply = useApplyDocumentActions();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function initializeSettings() {
    setIsSaving(true);
    try {
      await apply([
        createDocument(SETTINGS_HANDLE, { ...DEFAULT_SHIPPING_RATES }),
        publishDocument(SETTINGS_HANDLE),
      ]);
      toast.success("Shipping rates created");
    } catch (error) {
      console.error("Unable to create shipping settings", error);
      toast.error("Unable to create shipping rates");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSettings() {
    setIsSaving(true);
    setSaved(false);
    try {
      await apply(publishDocument(SETTINGS_HANDLE));
      setSaved(true);
      toast.success("Shipping rates published");
      window.setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Unable to publish shipping settings", error);
      toast.error("Unable to publish shipping rates");
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <Truck className="mx-auto size-10 text-zinc-400" />
        <h2 className="mt-4 text-lg font-semibold">Create shipping rates</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
          Start with KSh 300 for Mombasa, KSh 500 for coastal counties,
          KSh 700 for Nairobi and KSh 1,000 for all other counties.
        </p>
        <Button
          type="button"
          className="mt-5"
          onClick={initializeSettings}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="animate-spin" />}
          Create default rates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {RATE_FIELDS.map((rate) => (
          <RateField key={rate.field} {...rate} />
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="animate-spin" />
          ) : saved ? (
            <Check />
          ) : (
            <Save />
          )}
          {saved ? "Published" : "Publish rates"}
        </Button>
      </div>
    </div>
  );
}

export function ShippingSettingsEditor() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2">
          {RATE_FIELDS.map((rate) => (
            <Skeleton key={rate.field} className="h-36 rounded-xl" />
          ))}
        </div>
      }
    >
      <ShippingSettingsContent />
    </Suspense>
  );
}
