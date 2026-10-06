import { z } from "zod";
import {
  KENYA_COUNTIES,
  type KenyaCounty,
} from "@/lib/shipping/kenya";

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
  county: z.enum(KENYA_COUNTIES),
  country: z.literal("Kenya"),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type ShippingAddressForm = Omit<ShippingAddress, "county"> & {
  county: KenyaCounty | "";
};

export const EMPTY_SHIPPING_ADDRESS: ShippingAddressForm = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  county: "",
  country: "Kenya",
};

export function parseShippingAddress(value: unknown): ShippingAddress | null {
  const parsed = shippingAddressSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
