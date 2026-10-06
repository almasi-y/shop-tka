import { CheckoutClient } from "./CheckoutClient";
import { auth } from "@clerk/nextjs/server";
import { parseShippingAddress } from "@/lib/checkout/shipping-address";
import { CUSTOMER_ADDRESS_BY_USER_QUERY } from "@/lib/sanity/queries/customers";
import { getShippingRates } from "@/lib/shipping/get-shipping-rates";
import { serverReadClient } from "@/sanity/lib/server-client";

export const metadata = {
  title: "Checkout | Code Innovators Shop",
  description: "Complete your purchase",
};

export default async function CheckoutPage() {
  const { userId } = await auth.protect();
  const [shippingRates, customer] = await Promise.all([
    getShippingRates(),
    serverReadClient.fetch(CUSTOMER_ADDRESS_BY_USER_QUERY, {
      clerkUserId: userId,
    }),
  ]);

  return (
    <CheckoutClient
      shippingRates={shippingRates}
      initialShippingAddress={parseShippingAddress(customer?.shippingAddress)}
    />
  );
}
