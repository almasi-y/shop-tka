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
      className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:from-amber-600 hover:to-orange-700 hover:shadow-xl dark:from-amber-600 dark:to-orange-700 dark:hover:from-amber-700 dark:hover:to-orange-800"
    >
      <Sparkles className="h-4 w-4" />
      Ask AI for similar products
    </Button>
  );
}
