"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ShippingAddressForm } from "@/lib/checkout/shipping-address";
import { KENYA_COUNTIES } from "@/lib/shipping/kenya";

interface ShippingAddressFieldsProps {
  address: ShippingAddressForm;
  onChange: (field: keyof ShippingAddressForm, value: string) => void;
  idPrefix?: string;
}

export function ShippingAddressFields({
  address,
  onChange,
  idPrefix = "shipping",
}: ShippingAddressFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>Full name</Label>
        <Input
          id={`${idPrefix}-name`}
          autoComplete="name"
          value={address.name}
          onChange={(event) => onChange("name", event.target.value)}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-line1`}>Address line 1</Label>
        <Input
          id={`${idPrefix}-line1`}
          autoComplete="address-line1"
          value={address.line1}
          onChange={(event) => onChange("line1", event.target.value)}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-line2`}>Address line 2 (optional)</Label>
        <Input
          id={`${idPrefix}-line2`}
          autoComplete="address-line2"
          value={address.line2 ?? ""}
          onChange={(event) => onChange("line2", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          autoComplete="address-level2"
          value={address.city}
          onChange={(event) => onChange("city", event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-postcode`}>Postal code (optional)</Label>
        <Input
          id={`${idPrefix}-postcode`}
          autoComplete="postal-code"
          value={address.postcode ?? ""}
          onChange={(event) => onChange("postcode", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-county`}>County</Label>
        <Select
          value={address.county || null}
          onValueChange={(value) => {
            if (value) onChange("county", value);
          }}
        >
          <SelectTrigger id={`${idPrefix}-county`} className="w-full">
            <SelectValue>{address.county || "Select a county"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {KENYA_COUNTIES.map((county) => (
              <SelectItem key={county} value={county}>
                {county}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-country`}>Country</Label>
        <Input
          id={`${idPrefix}-country`}
          autoComplete="country-name"
          value="Kenya"
          readOnly
        />
      </div>
    </div>
  );
}
