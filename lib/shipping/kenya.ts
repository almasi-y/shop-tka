import { z } from "zod";

export const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
] as const;

export type KenyaCounty = (typeof KENYA_COUNTIES)[number];

export const DEFAULT_SHIPPING_RATES = {
  mombasaFee: 300,
  coastalFee: 500,
  nairobiFee: 700,
  otherKenyaFee: 1000,
} as const;

export const shippingRatesSchema = z.object({
  mombasaFee: z.number().int().min(0),
  coastalFee: z.number().int().min(0),
  nairobiFee: z.number().int().min(0),
  otherKenyaFee: z.number().int().min(0),
});

export type ShippingRates = z.infer<typeof shippingRatesSchema>;

const COASTAL_COUNTIES = new Set<KenyaCounty>([
  "Kilifi",
  "Kwale",
  "Lamu",
  "Taita-Taveta",
  "Tana River",
]);

export function isKenyaCounty(value: string): value is KenyaCounty {
  return (KENYA_COUNTIES as readonly string[]).includes(value);
}

export function getShippingFee(
  county: KenyaCounty,
  rates: ShippingRates,
): number {
  if (county === "Mombasa") return rates.mombasaFee;
  if (county === "Nairobi") return rates.nairobiFee;
  if (COASTAL_COUNTIES.has(county)) return rates.coastalFee;
  return rates.otherKenyaFee;
}

export function getShippingZone(county: KenyaCounty) {
  if (county === "Mombasa") return "Mombasa";
  if (county === "Nairobi") return "Nairobi";
  if (COASTAL_COUNTIES.has(county)) return "Coastal counties";
  return "Other Kenyan counties";
}
