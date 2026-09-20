"use client";

import Link from "next/link";
import { MessageCircle, ShoppingCart } from "lucide-react";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useCartActions, useTotalItems } from "@/lib/store/cart-store-provider";
import { useChatActions } from "@/lib/store/chat-store-provider";

export function Header() {
  const totalItems = useTotalItems();
  const { openCart } = useCartActions();
  const { openChat } = useChatActions();
  const { isSignedIn } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-100">
          Robotics Store
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={openChat} aria-label="Open assistant">
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={openCart} aria-label="Open cart">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && <span className="sr-only">{totalItems} items</span>}
          </Button>
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal" />
          )}
        </nav>
      </div>
    </header>
  );
}
