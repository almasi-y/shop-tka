"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShippingAddressFields } from "@/components/app/ShippingAddressFields";
import {
  EMPTY_SHIPPING_ADDRESS,
  type ShippingAddress,
  type ShippingAddressForm,
} from "@/lib/checkout/shipping-address";

interface AccountAddressFormProps {
  initialAddress: ShippingAddress | null;
}

export function AccountAddressForm({
  initialAddress,
}: AccountAddressFormProps) {
  const [address, setAddress] = useState<ShippingAddressForm>(() => ({
    ...EMPTY_SHIPPING_ADDRESS,
    ...initialAddress,
  }));
  const [isSaving, setIsSaving] = useState(false);

  function updateAddress(field: keyof ShippingAddressForm, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  async function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/account/address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address),
      });
      const result = (await response.json()) as {
        address?: ShippingAddress;
        error?: string;
      };

      if (!response.ok || !result.address) {
        throw new Error(result.error ?? "Unable to save your address");
      }

      setAddress(result.address);
      toast.success("Shipping address saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save your address",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={saveAddress} className="space-y-6">
      <ShippingAddressFields
        address={address}
        onChange={updateAddress}
        idPrefix="account-address"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {isSaving ? "Saving..." : "Save Address"}
        </Button>
      </div>
    </form>
  );
}
