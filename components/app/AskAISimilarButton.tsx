"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatActions } from "@/lib/store/chat-store-provider";

interface AskAISimilarButtonProps {
  productName: string;
  category?: string | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
}

export function AskAISimilarButton({
  productName,
  category,
  brand,
  color,
  size,
}: AskAISimilarButtonProps) {
  const { openChatWithMessage } = useChatActions();

  const handleClick = () => {
    const attributes = [category, brand, color, size].filter(Boolean).join(", ");
    openChatWithMessage(
      `Show me products similar to "${productName}"${attributes ? ` (${attributes})` : ""}. Do not include the same product.`,
    );
  };

  return (
    <Button
      onClick={handleClick}
      className="w-full gap-2 bg-brand text-white shadow-lg hover:bg-brand/90 hover:shadow-xl "
    >
      <Sparkles className="h-4 w-4" />
      Ask AI for similar products
    </Button>
  );
}
