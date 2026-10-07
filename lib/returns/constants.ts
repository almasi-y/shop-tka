export const RETURN_RESOLUTIONS = [
  { value: "refund", label: "Refund" },
  { value: "exchange", label: "Exchange" },
  { value: "repair", label: "Repair" },
] as const;

export const RETURN_REASONS = [
  { value: "damaged", label: "Damaged on arrival" },
  { value: "faulty", label: "Faulty or not working" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "other", label: "Other" },
] as const;

export const RETURN_STATUSES = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "received", label: "Item received" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
] as const;

export type ReturnResolution = (typeof RETURN_RESOLUTIONS)[number]["value"];
export type ReturnReason = (typeof RETURN_REASONS)[number]["value"];
export type ReturnStatus = (typeof RETURN_STATUSES)[number]["value"];

export function getReturnResolutionLabel(value: string | null | undefined) {
  return (
    RETURN_RESOLUTIONS.find((option) => option.value === value)?.label ??
    "Unknown"
  );
}

export function getReturnReasonLabel(value: string | null | undefined) {
  return (
    RETURN_REASONS.find((option) => option.value === value)?.label ?? "Other"
  );
}

export function getReturnStatusLabel(value: string | null | undefined) {
  return (
    RETURN_STATUSES.find((option) => option.value === value)?.label ?? "Pending review"
  );
}
