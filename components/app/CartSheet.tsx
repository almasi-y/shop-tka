"use client";

import { CartItem } from "@/components/app/CartItem";
import { CartSummary } from "@/components/app/CartSummary";
import { useCartItems, useCartIsOpen, useCartActions } from "@/lib/store/cart-store-provider";
import { useCartStock } from "@/lib/hooks/useCartStock";

export function CartSheet() {
  const items = useCartItems();
  const isOpen = useCartIsOpen();
  const { closeCart } = useCartActions();
  const { stockMap, hasStockIssues } = useCartStock(items);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={closeCart}>
      <aside className="flex h-full w-full max-w-md flex-col bg-white dark:bg-zinc-950" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="font-semibold">Your Cart</h2>
          <button type="button" onClick={closeCart} aria-label="Close cart">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? <p className="py-12 text-center text-sm text-zinc-500">Your cart is empty.</p> : items.map((item) => <CartItem key={item.productId} item={item} stockInfo={stockMap.get(item.productId)} />)}
        </div>
        <CartSummary hasStockIssues={hasStockIssues} />
      </aside>
    </div>
  );
}