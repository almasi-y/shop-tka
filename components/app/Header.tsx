"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  MessageCircle,
  PhoneCall,
  Search,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartActions, useTotalItems } from "@/lib/store/cart-store-provider";
import { useChatActions } from "@/lib/store/chat-store-provider";

function StoreSearch({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form
      action="/"
      method="get"
      role="search"
      className="flex h-11 w-full overflow-hidden rounded-lg border border-brand-blue/35 bg-white shadow-sm transition-shadow focus-within:border-brand-blue focus-within:ring-3 focus-within:ring-brand-blue/20 dark:bg-zinc-900"
    >
      <label htmlFor="store-search" className="sr-only">
        Search the store
      </label>
      <Input
        key={defaultValue}
        id="store-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search products, components and kits"
        className="h-full rounded-none border-0 bg-transparent px-4 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
      />
      <Button
        type="submit"
        aria-label="Search products"
        className="h-full w-12 rounded-none bg-brand-purple px-0 text-white hover:bg-brand-purple/90"
      >
        <Search className="size-5" />
      </Button>
    </form>
  );
}

function CurrentStoreSearch() {
  const searchParams = useSearchParams();
  return <StoreSearch defaultValue={searchParams.get("q") ?? ""} />;
}

export function Header() {
  const totalItems = useTotalItems();
  const { openCart } = useCartActions();
  const { openChat } = useChatActions();
  const { isSignedIn } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="bg-brand-blue text-white">
        <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-end gap-4 px-4 py-1.5 text-xs sm:justify-between sm:px-6 lg:px-8">
          <p className="hidden font-medium tracking-wide text-white/90 sm:block">
            Your one-stop shop for STEM, robotics, automation and turnkey projects.
          </p>
          <a
            href="tel:+25480754126"
            className="inline-flex items-center gap-2 whitespace-nowrap font-medium text-white/90 transition-colors hover:text-white"
          >
            <PhoneCall className="size-3.5" aria-hidden="true" />
            +25480754126
          </a>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 px-4 py-3 sm:px-6 md:grid-cols-[auto_minmax(16rem,1fr)_auto] md:gap-6 lg:px-8">
        <Link href="/" aria-label="TechKidz Africa home" className="shrink-0">
          <Image
            src="/branding/logo.svg"
            alt="TechKidz Africa"
            width={270}
            height={135}
            loading="eager"
            className="h-14 w-auto object-contain sm:h-16"
          />
        </Link>

        <div className="order-3 col-span-2 w-full md:order-none md:col-span-1">
          <Suspense fallback={<StoreSearch />}>
            <CurrentStoreSearch />
          </Suspense>
        </div>

        <nav className="flex items-center justify-end gap-1 sm:gap-2" aria-label="Store controls">
          <Button
            variant="ghost"
            size="icon"
            onClick={openChat}
            aria-label="Open shopping assistant"
          >
            <MessageCircle className="size-5" />
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
            <ShoppingCart className="size-5" />
            {totalItems > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-purple px-1 text-[0.65rem] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-zinc-950"
              >
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Button>
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal" withSignUp>
              <Button variant="ghost" size="sm" aria-label="Sign in or register">
                <UserRound className="size-5" />
                <span className="hidden lg:inline">Sign in</span>
              </Button>
            </SignInButton>
          )}
        </nav>
      </div>
    </header>
  );
}
