import { auth } from "@clerk/nextjs/server";
import { MapPin } from "lucide-react";
import { AccountAddressForm } from "@/components/app/AccountAddressForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseShippingAddress } from "@/lib/checkout/shipping-address";
import { CUSTOMER_ADDRESS_BY_USER_QUERY } from "@/lib/sanity/queries/customers";
import { serverReadClient } from "@/sanity/lib/server-client";

export const metadata = {
  title: "My Address | Code Innovators Shop",
  description: "Manage your default delivery address",
};

export default async function AccountAddressPage() {
  const { userId } = await auth.protect();
  const customer = await serverReadClient.fetch(
    CUSTOMER_ADDRESS_BY_USER_QUERY,
    { clerkUserId: userId },
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-mist text-brand-blue">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              My Address
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Save the delivery address you use most often.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default shipping address</CardTitle>
          <CardDescription>
            This address will automatically fill your checkout form. You can
            still change it before paying.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountAddressForm
            initialAddress={parseShippingAddress(customer?.shippingAddress)}
          />
        </CardContent>
      </Card>
    </main>
  );
}
