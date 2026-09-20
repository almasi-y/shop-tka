import { CheckoutClient } from "./CheckoutClient";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Checkout | Robotics Store",
  description: "Complete your purchase",
};

export default async function CheckoutPage() {
  await auth.protect();

  return <CheckoutClient />;
}
