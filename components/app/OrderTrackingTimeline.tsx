"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Check,
  Circle,
  CircleCheckBig,
  CircleX,
  Clock3,
  CreditCard,
  ExternalLink,
  MapPin,
  PackageCheck,
  PackageOpen,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getFulfillmentStatus,
  type FulfillmentStatusValue,
} from "@/lib/constants/orderTracking";
import { cn, formatDate } from "@/lib/utils";

export interface CustomerTrackingEvent {
  _key: string;
  status: string | null;
  occurredAt: string | null;
  publicMessage: string | null;
  location: string | null;
}

interface OrderTrackingTimelineProps {
  trackingNumber: string | null;
  fulfillmentStatus: string | null;
  courierName: string | null;
  courierTrackingNumber: string | null;
  courierTrackingUrl: string | null;
  estimatedDeliveryAt: string | null;
  currentLocation: string | null;
  events: CustomerTrackingEvent[] | null;
}

interface TrackingStage {
  value: "payment_confirmed" | FulfillmentStatusValue;
  label: string;
  icon: LucideIcon;
}

const STANDARD_STAGES: TrackingStage[] = [
  { value: "payment_confirmed", label: "Payment confirmed", icon: CreditCard },
  { value: "processing", label: "Processing", icon: Clock3 },
  { value: "packed", label: "Packed", icon: PackageOpen },
  { value: "dispatched", label: "Dispatched", icon: Truck },
  {
    value: "out_for_delivery",
    label: "Out for delivery",
    icon: PackageCheck,
  },
  { value: "delivered", label: "Delivered", icon: CircleCheckBig },
];

const CANCELLED_STAGE: TrackingStage = {
  value: "cancelled",
  label: "Cancelled",
  icon: CircleX,
};

function eventTime(event: CustomerTrackingEvent) {
  if (!event.occurredAt) return 0;
  const timestamp = new Date(event.occurredAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function OrderTrackingTimeline({
  trackingNumber,
  fulfillmentStatus,
  courierName,
  courierTrackingNumber,
  courierTrackingUrl,
  estimatedDeliveryAt,
  currentLocation,
  events,
}: OrderTrackingTimelineProps) {
  const shouldReduceMotion = useReducedMotion();
  const status = getFulfillmentStatus(fulfillmentStatus);
  const currentStatus = status.value;
  const StatusIcon = status.icon;
  const publicEvents = [...(events ?? [])]
    .filter((event) => Boolean(event.publicMessage))
    .sort((left, right) => eventTime(left) - eventTime(right));
  const eventsByStage = new Map<string, CustomerTrackingEvent[]>();

  for (const event of publicEvents) {
    if (!event.status) continue;
    const stageEvents = eventsByStage.get(event.status) ?? [];
    stageEvents.push(event);
    eventsByStage.set(event.status, stageEvents);
  }

  const isCancelled = currentStatus === "cancelled";
  const stages = isCancelled
    ? [
        ...STANDARD_STAGES.filter(
          (stage) =>
            stage.value === "payment_confirmed" ||
            eventsByStage.has(stage.value),
        ),
        CANCELLED_STAGE,
      ]
    : STANDARD_STAGES;
  const currentStageIndex = STANDARD_STAGES.findIndex(
    (stage) => stage.value === currentStatus,
  );
  const hasDeliveryDetails = Boolean(
    estimatedDeliveryAt ||
      courierName ||
      courierTrackingNumber ||
      currentLocation,
  );

  return (
    <section
      aria-labelledby="order-tracking-heading"
      className="mb-8 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="border-b border-zinc-200 p-5 dark:border-zinc-800 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">Order tracking</p>
            <h2
              id="order-tracking-heading"
              className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              {trackingNumber ?? "Tracking is being prepared"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Follow your order from payment confirmation to delivery.
            </p>
          </div>
          <Badge
            className={`${status.color} flex w-fit items-center gap-1.5 px-3 py-1.5`}
          >
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </Badge>
        </div>

        {hasDeliveryDetails ? (
          <dl className="mt-5 grid gap-3 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4 dark:bg-zinc-900">
            {estimatedDeliveryAt ? (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Estimated delivery
                </dt>
                <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDate(estimatedDeliveryAt, "datetime")}
                </dd>
              </div>
            ) : null}
            {courierName ? (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Courier</dt>
                <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {courierName}
                </dd>
              </div>
            ) : null}
            {courierTrackingNumber ? (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Courier reference
                </dt>
                <dd className="mt-1 break-all font-medium text-zinc-900 dark:text-zinc-100">
                  {courierTrackingNumber}
                </dd>
              </div>
            ) : null}
            {currentLocation ? (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Current location
                </dt>
                <dd className="mt-1 flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-100">
                  <MapPin className="h-3.5 w-3.5 text-brand" />
                  {currentLocation}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {courierTrackingUrl ? (
          <a
            href={courierTrackingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            Track on courier website
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <ol className="p-5 sm:p-6">
        {stages.map((stage, index) => {
          const stageEvents = eventsByStage.get(stage.value) ?? [];
          const standardIndex = STANDARD_STAGES.findIndex(
            (candidate) => candidate.value === stage.value,
          );
          const isCurrent = stage.value === currentStatus;
          const isComplete =
            !isCurrent &&
            (stageEvents.length > 0 ||
              (!isCancelled && standardIndex < currentStageIndex));
          const isPending = !isCurrent && !isComplete;
          const StageIcon = stage.icon;
          const isLast = index === stages.length - 1;

          return (
            <motion.li
              key={stage.value}
              aria-current={isCurrent ? "step" : undefined}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="relative grid grid-cols-[2rem_1fr] gap-4 pb-7 last:pb-0"
            >
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[0.9375rem] top-8 h-[calc(100%-2rem)] w-px",
                    isComplete ? "bg-brand" : "bg-zinc-200 dark:bg-zinc-700",
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-zinc-950",
                  isComplete && "border-brand bg-brand text-white dark:bg-brand",
                  isCurrent && "border-brand text-brand",
                  isPending &&
                    "border-zinc-200 text-zinc-400 dark:border-zinc-700",
                  stage.value === "cancelled" &&
                    isCurrent &&
                    "border-red-600 text-red-600",
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : isPending ? (
                  <Circle className="h-3 w-3" />
                ) : (
                  <StageIcon className="h-4 w-4" />
                )}
              </span>

              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3
                    className={cn(
                      "font-semibold",
                      isPending
                        ? "text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-900 dark:text-zinc-100",
                    )}
                  >
                    {stage.label}
                  </h3>
                  {stageEvents.at(-1)?.occurredAt ? (
                    <time className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(
                        stageEvents.at(-1)?.occurredAt,
                        "datetime",
                      )}
                    </time>
                  ) : null}
                </div>

                {stageEvents.map((event) => (
                  <div key={event._key} className="mt-1.5 text-sm">
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {event.publicMessage}
                    </p>
                    {event.location ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    ) : null}
                  </div>
                ))}

                {stage.value === "delivered" &&
                isPending &&
                estimatedDeliveryAt ? (
                  <p className="mt-1 text-sm text-zinc-500">
                    Estimated {formatDate(estimatedDeliveryAt, "long")}
                  </p>
                ) : null}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
