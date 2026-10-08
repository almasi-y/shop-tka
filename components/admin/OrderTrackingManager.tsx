"use client";

import { useState } from "react";
import {
  publishDocument,
  useApplyDocumentActions,
  useCurrentUser,
  useEditDocument,
  type DocumentHandle,
} from "@sanity/sdk-react";
import { CalendarClock, Loader2, MapPin, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FULFILLMENT_STATUS_CONFIG,
  FULFILLMENT_STATUS_VALUES,
  getFulfillmentStatus,
  isEarlierFulfillmentStatus,
  type FulfillmentStatusValue,
} from "@/lib/constants/orderTracking";
import { formatDate } from "@/lib/utils";

export interface AdminTrackingEvent {
  _key: string;
  _type: "trackingEvent";
  status: string;
  occurredAt: string;
  publicMessage?: string;
  location?: string;
  source: "system" | "admin" | "courier";
  actorName?: string;
  internalNote?: string;
}

export interface AdminTrackingData {
  trackingNumber: string | null;
  fulfillmentStatus: string | null;
  courierName: string | null;
  courierTrackingNumber: string | null;
  courierTrackingUrl: string | null;
  estimatedDeliveryAt: string | null;
  currentLocation: string | null;
  trackingEvents: AdminTrackingEvent[] | null;
}

interface EditableTrackingOrder extends Record<string, unknown> {
  status?: "paid" | "shipped" | "delivered" | "cancelled";
  fulfillmentStatus?: FulfillmentStatusValue;
  courierName?: string;
  courierTrackingNumber?: string;
  courierTrackingUrl?: string;
  estimatedDeliveryAt?: string;
  currentLocation?: string;
  trackingEvents?: AdminTrackingEvent[];
  packedAt?: string;
  shippedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

interface OrderTrackingManagerProps {
  handle: DocumentHandle;
  tracking: AdminTrackingData;
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isSecureUrl(value: string) {
  if (!value.trim()) return true;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function OrderTrackingManager({
  handle,
  tracking,
}: OrderTrackingManagerProps) {
  const currentUser = useCurrentUser();
  const currentStatus = getFulfillmentStatus(
    tracking.fulfillmentStatus,
  ).value;
  const [status, setStatus] = useState<FulfillmentStatusValue>(currentStatus);
  const [courierName, setCourierName] = useState(tracking.courierName ?? "");
  const [courierTrackingNumber, setCourierTrackingNumber] = useState(
    tracking.courierTrackingNumber ?? "",
  );
  const [courierTrackingUrl, setCourierTrackingUrl] = useState(
    tracking.courierTrackingUrl ?? "",
  );
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState(
    toLocalDateTime(tracking.estimatedDeliveryAt),
  );
  const [currentLocation, setCurrentLocation] = useState(
    tracking.currentLocation ?? "",
  );
  const [publicMessage, setPublicMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editOrder = useEditDocument<EditableTrackingOrder>(handle);
  const apply = useApplyDocumentActions();
  const statusConfig = getFulfillmentStatus(status);
  const StatusIcon = statusConfig.icon;
  const events = tracking.trackingEvents ?? [];

  const handleStatusChange = (nextValue: string | null) => {
    if (!nextValue) return;
    const nextStatus = nextValue as FulfillmentStatusValue;
    setStatus(nextStatus);
    setPublicMessage(FULFILLMENT_STATUS_CONFIG[nextStatus].defaultMessage);
  };

  const handleSave = async () => {
    setError(null);

    if (!isSecureUrl(courierTrackingUrl)) {
      setError("Courier tracking links must use a valid HTTPS URL.");
      return;
    }

    const estimatedDeliveryDate = estimatedDeliveryAt
      ? new Date(estimatedDeliveryAt)
      : null;

    if (
      estimatedDeliveryDate &&
      Number.isNaN(estimatedDeliveryDate.getTime())
    ) {
      setError("Enter a valid estimated delivery date and time.");
      return;
    }

    const statusChanged = status !== currentStatus;
    const publicUpdate = optionalValue(publicMessage);
    const privateUpdate = optionalValue(internalNote);

    if (privateUpdate && !statusChanged && !publicUpdate) {
      setError(
        "A private note must accompany a new customer update or fulfillment-stage change.",
      );
      return;
    }

    if (
      (status === "cancelled" ||
        isEarlierFulfillmentStatus(status, currentStatus)) &&
      !window.confirm(
        status === "cancelled"
          ? "Cancel this order? The cancellation will remain in its tracking history."
          : "Move this order to an earlier stage? The previous tracking history will be retained.",
      )
    ) {
      return;
    }

    const now = new Date().toISOString();
    const shouldAppendEvent = Boolean(statusChanged || publicUpdate);
    const publishedHandle = {
      ...handle,
      documentId: handle.documentId.replace(/^drafts\./, ""),
    };

    setIsSaving(true);
    try {
      await editOrder((current) => {
        const next: EditableTrackingOrder = {
          ...current,
          status: statusConfig.legacyStatus,
          fulfillmentStatus: status,
          courierName: optionalValue(courierName),
          courierTrackingNumber: optionalValue(courierTrackingNumber),
          courierTrackingUrl: optionalValue(courierTrackingUrl),
          estimatedDeliveryAt:
            estimatedDeliveryDate?.toISOString() ?? undefined,
          currentLocation: optionalValue(currentLocation),
        };

        const timestampField = statusConfig.timestampField;
        if (statusChanged && timestampField && !current[timestampField]) {
          next[timestampField] = now;
        }

        if (shouldAppendEvent) {
          const event: AdminTrackingEvent = {
            _key: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
            _type: "trackingEvent",
            status,
            occurredAt: now,
            publicMessage:
              publicUpdate ??
              (statusChanged ? statusConfig.defaultMessage : undefined),
            location: optionalValue(currentLocation),
            source: "admin",
            actorName: currentUser?.name,
            internalNote: privateUpdate,
          };
          next.trackingEvents = [...(current.trackingEvents ?? []), event];
        }

        return next;
      });
      await apply(publishDocument(publishedHandle));
      setPublicMessage("");
      setInternalNote("");
      toast.success("Tracking update published");
    } catch (saveError) {
      console.error("Unable to update order tracking", saveError);
      setError("Unable to save and publish this tracking update. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-zinc-500" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Fulfillment & tracking
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tracking number: {tracking.trackingNumber ?? "Not generated"}
          </p>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusConfig.color}`}
        >
          <StatusIcon className="h-4 w-4" />
          {statusConfig.label}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fulfillment-status">Fulfillment stage</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger id="fulfillment-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FULFILLMENT_STATUS_VALUES.map((value) => {
                  const config = FULFILLMENT_STATUS_CONFIG[value];
                  const Icon = config.icon;
                  return (
                    <SelectItem key={value} value={value}>
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="courier-name">Courier</Label>
              <Input
                id="courier-name"
                value={courierName}
                onChange={(event) => setCourierName(event.target.value)}
                placeholder="Optional courier name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courier-reference">Courier reference</Label>
              <Input
                id="courier-reference"
                value={courierTrackingNumber}
                onChange={(event) =>
                  setCourierTrackingNumber(event.target.value)
                }
                placeholder="Optional tracking reference"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="courier-url">Courier tracking URL</Label>
            <Input
              id="courier-url"
              type="url"
              value={courierTrackingUrl}
              onChange={(event) => setCourierTrackingUrl(event.target.value)}
              placeholder="https://courier.example/track/..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="estimated-delivery">Estimated delivery</Label>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-zinc-400" />
                <Input
                  id="estimated-delivery"
                  type="datetime-local"
                  value={estimatedDeliveryAt}
                  onChange={(event) =>
                    setEstimatedDeliveryAt(event.target.value)
                  }
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current-location">Current location</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-zinc-400" />
                <Input
                  id="current-location"
                  value={currentLocation}
                  onChange={(event) => setCurrentLocation(event.target.value)}
                  placeholder="Mombasa"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-update">Customer-visible update</Label>
            <Textarea
              id="customer-update"
              value={publicMessage}
              onChange={(event) => setPublicMessage(event.target.value)}
              placeholder={statusConfig.defaultMessage}
              maxLength={240}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="internal-note">Private internal note</Label>
            <Textarea
              id="internal-note"
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Never shown to the customer"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving update…
              </>
            ) : (
              "Save and publish tracking update"
            )}
          </Button>
        </div>

        <div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
            Tracking history
          </h3>
          {events.length > 0 ? (
            <ol className="mt-4 space-y-4 border-l border-zinc-200 pl-5 dark:border-zinc-700">
              {events.map((event) => {
                const config = getFulfillmentStatus(event.status);
                return (
                  <li key={event._key} className="relative">
                    <span className="absolute -left-[1.58rem] top-1.5 h-2 w-2 rounded-full bg-brand ring-4 ring-white dark:ring-zinc-900" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {event.status === "payment_confirmed"
                          ? "Payment confirmed"
                          : config.label}
                      </p>
                      <time className="text-xs text-zinc-500">
                        {formatDate(event.occurredAt, "datetime")}
                      </time>
                    </div>
                    {event.publicMessage ? (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {event.publicMessage}
                      </p>
                    ) : null}
                    {event.location ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Location: {event.location}
                      </p>
                    ) : null}
                    {event.internalNote ? (
                      <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        Internal: {event.internalNote}
                      </p>
                    ) : null}
                    {event.actorName ? (
                      <p className="mt-1 text-xs text-zinc-400">
                        Updated by {event.actorName}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              No tracking updates have been recorded.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
