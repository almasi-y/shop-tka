"use client";

import Link from "next/link";
import Image from "next/image";
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
        <Link href="/" aria-label="TechKidz Africa home" className="shrink-0">
          <Image
            src="/branding/logo.svg"
            alt="TechKidz Africa"
            width={270}
            height={135}
            loading="eager"
            className="h-12 w-auto object-contain sm:h-14"
          />
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={openChat} aria-label="Open assistant">
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openCart}
            className="relative"
            aria-label={
              totalItems > 0
                ? `Open cart, ${totalItems} ${totalItems === 1 ? "item" : "items"}`
                : "Open cart"
            }
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.65rem] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-zinc-950"
              >
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
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
