import "server-only";

import {
  DEFAULT_SHIPPING_RATES,
  shippingRatesSchema,
  type ShippingRates,
} from "@/lib/shipping/kenya";
import { SHIPPING_SETTINGS_QUERY } from "@/lib/sanity/queries/shipping";
import { serverReadClient } from "@/sanity/lib/server-client";

export async function getShippingRates(): Promise<ShippingRates> {
  try {
    const settings = await serverReadClient.fetch(SHIPPING_SETTINGS_QUERY);
    const result = shippingRatesSchema.safeParse(settings);
    return result.success ? result.data : { ...DEFAULT_SHIPPING_RATES };
  } catch (error) {
    console.error("Unable to load shipping settings", error);
    return { ...DEFAULT_SHIPPING_RATES };
  }
}
