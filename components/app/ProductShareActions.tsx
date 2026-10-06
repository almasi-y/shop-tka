"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ProductShareActionsProps {
  productName: string;
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);

  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();

  return copied ? Promise.resolve() : Promise.reject(new Error("Copy failed"));
}

export function ProductShareActions({ productName }: ProductShareActionsProps) {
  async function handleCopy() {
    try {
      await copyText(window.location.href);
      toast.success("Product link copied");
    } catch {
      toast.error("Unable to copy the product link");
    }
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(
      `Take a look at ${productName}: ${window.location.href}`,
    );
    window.open(
      `https://wa.me/?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-zinc-500 dark:text-zinc-400">
        Share
      </span>
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        <Copy aria-hidden="true" />
        Copy link
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleWhatsApp}
      >
        <MessageCircle aria-hidden="true" />
        WhatsApp
      </Button>
    </div>
  );
}
