import { ShippingSettingsEditor } from "@/components/admin/ShippingSettingsEditor";

export const metadata = {
  title: "Shipping Settings | Code Innovators Shop",
};

export default function ShippingSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Shipping Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
          Set the delivery fee charged for each Kenyan shipping zone.
        </p>
      </div>
      <ShippingSettingsEditor />
    </div>
  );
}
