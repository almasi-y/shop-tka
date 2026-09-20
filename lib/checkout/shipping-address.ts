import { z } from "zod";

const optionalAddressLine = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((value) => value || undefined);

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(160),
  line2: optionalAddressLine,
  city: z.string().trim().min(2).max(100),
  postcode: optionalAddressLine,
  country: z.string().trim().min(2).max(100),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
