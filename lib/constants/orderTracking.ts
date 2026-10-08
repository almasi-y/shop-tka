import {
  CheckCircle2,
  CircleX,
  Clock3,
  PackageCheck,
  PackageOpen,
  Truck,
  type LucideIcon,
} from "lucide-react";

export type FulfillmentStatusValue =
  | "processing"
  | "packed"
  | "dispatched"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface FulfillmentStatusConfig {
  value: FulfillmentStatusValue;
  label: string;
  defaultMessage: string;
  color: string;
  icon: LucideIcon;
  legacyStatus: "paid" | "shipped" | "delivered" | "cancelled";
  timestampField:
    | "packedAt"
    | "shippedAt"
    | "outForDeliveryAt"
    | "deliveredAt"
    | "cancelledAt"
    | null;
}

export const FULFILLMENT_STATUS_VALUES: FulfillmentStatusValue[] = [
  "processing",
  "packed",
  "dispatched",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const FULFILLMENT_STATUS_CONFIG: Record<
  FulfillmentStatusValue,
  FulfillmentStatusConfig
> = {
  processing: {
    value: "processing",
    label: "Processing",
    defaultMessage: "Your order is being prepared.",
    color: "bg-indigo-100 text-indigo-800",
    icon: Clock3,
    legacyStatus: "paid",
    timestampField: null,
  },
  packed: {
    value: "packed",
    label: "Packed",
    defaultMessage: "Your order has been packed and is awaiting dispatch.",
    color: "bg-violet-100 text-violet-800",
    icon: PackageOpen,
    legacyStatus: "paid",
    timestampField: "packedAt",
  },
  dispatched: {
    value: "dispatched",
    label: "Dispatched",
    defaultMessage: "Your order has been dispatched.",
    color: "bg-blue-100 text-blue-800",
    icon: Truck,
    legacyStatus: "shipped",
    timestampField: "shippedAt",
  },
  out_for_delivery: {
    value: "out_for_delivery",
    label: "Out for delivery",
    defaultMessage: "Your order is out for delivery.",
    color: "bg-sky-100 text-sky-800",
    icon: PackageCheck,
    legacyStatus: "shipped",
    timestampField: "outForDeliveryAt",
  },
  delivered: {
    value: "delivered",
    label: "Delivered",
    defaultMessage: "Your order has been delivered.",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
    legacyStatus: "delivered",
    timestampField: "deliveredAt",
  },
  cancelled: {
    value: "cancelled",
    label: "Cancelled",
    defaultMessage: "This order was cancelled.",
    color: "bg-red-100 text-red-800",
    icon: CircleX,
    legacyStatus: "cancelled",
    timestampField: "cancelledAt",
  },
};

export const FULFILLMENT_STATUS_TABS = [
  { value: "all", label: "All" },
  ...FULFILLMENT_STATUS_VALUES.map((value) => ({
    value,
    label: FULFILLMENT_STATUS_CONFIG[value].label,
  })),
];

export function getFulfillmentStatus(status: string | null | undefined) {
  return (
    FULFILLMENT_STATUS_CONFIG[status as FulfillmentStatusValue] ??
    FULFILLMENT_STATUS_CONFIG.processing
  );
}

export function isEarlierFulfillmentStatus(
  next: FulfillmentStatusValue,
  current: FulfillmentStatusValue,
) {
  if (next === "cancelled") return false;
  if (current === "cancelled") return true;

  return (
    FULFILLMENT_STATUS_VALUES.indexOf(next) <
    FULFILLMENT_STATUS_VALUES.indexOf(current)
  );
}

export function isShippingAddressLocked(
  status: string | null | undefined,
) {
  return (
    status === "dispatched" ||
    status === "out_for_delivery" ||
    status === "delivered" ||
    status === "cancelled"
  );
}
