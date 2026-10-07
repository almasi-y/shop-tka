import { z } from "zod";
import { RETURN_REASONS, RETURN_RESOLUTIONS } from "./constants";

const returnResolutionValues = RETURN_RESOLUTIONS.map(
  (option) => option.value,
) as ["refund", "exchange", "repair"];
const returnReasonValues = RETURN_REASONS.map((option) => option.value) as [
  "damaged",
  "faulty",
  "wrong_item",
  "not_as_described",
  "other",
];

export const returnRequestInputSchema = z.object({
  orderId: z.string().trim().min(1).max(200),
  resolution: z.enum(returnResolutionValues),
  reason: z.enum(returnReasonValues),
  notes: z.string().trim().min(5).max(1000),
  packagingConfirmed: z.literal(true, {
    error:
      "Confirm that the item will be returned with its original packaging and accessories",
  }),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .min(1)
    .max(100),
});
