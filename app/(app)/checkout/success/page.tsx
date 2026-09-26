import { SuccessClient } from "./SuccessClient";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Payment Confirmation | TechKidz Africa",
  description: "Confirm your Paystack payment",
};

interface SuccessPageProps {
  searchParams: Promise<{ reference?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  await auth.protect();
  const { reference } = await searchParams;
  return <SuccessClient reference={reference ?? null} />;
}
