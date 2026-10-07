"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useStore } from "zustand";
import {
  createCartStore,
  type CartStore,
  type CartState,
  defaultInitState,
} from "./cart-store";

// Store API type
export type CartStoreApi = ReturnType<typeof createCartStore>;

// Context
const CartStoreContext = createContext<CartStoreApi | undefined>(undefined);

// Provider props
interface CartStoreProviderProps {
  children: ReactNode;
  initialState?: CartState;
}

/**
 * Cart store provider - creates one store instance per provider
 * Loads and saves only the active Clerk user's server-side cart.
 * Wrap your app/(app) layout with this provider
 */
export const CartStoreProvider = ({
  children,
  initialState,
}: CartStoreProviderProps) => {
  const { isLoaded, userId } = useAuth();
  const [store] = useState(() =>
    createCartStore(initialState ?? defaultInitState),
  );

  useEffect(() => {
    // This legacy key was shared by every account using the browser. It must
    // never be restored now that carts are account-scoped.
    window.localStorage.removeItem("cart-storage");
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      store.getState().replaceCart(null, [], true);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let saveQueue = Promise.resolve();
    store.getState().replaceCart(userId, [], false);

    function beginSaving() {
      if (cancelled) return;
      unsubscribe = store.subscribe((state, previousState) => {
        if (
          state.items === previousState.items ||
          state.ownerUserId !== userId ||
          !state.isSynced
        ) {
          return;
        }

        const items = state.items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        }));
        saveQueue = saveQueue
          .then(async () => {
            const saveResponse = await fetch("/api/cart", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ownerUserId: userId, items }),
            });
            if (!saveResponse.ok) {
              const result = (await saveResponse.json()) as { error?: string };
              throw new Error(result.error ?? "Unable to save cart");
            }
          })
          .catch((error: unknown) => {
            console.error("Cart synchronization failed", error);
          });
      });
    }

    async function loadCart() {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        const result = (await response.json()) as {
          items?: CartState["items"];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "Unable to load cart");
        if (cancelled) return;

        store.getState().replaceCart(userId!, result.items ?? [], true);
        beginSaving();
      } catch (error) {
        if (cancelled) return;
        console.error("Cart loading failed", error);
        store.getState().replaceCart(userId!, [], true);
        beginSaving();
      }
    }

    void loadCart();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLoaded, store, userId]);

  return (
    <CartStoreContext.Provider value={store}>
      {children}
    </CartStoreContext.Provider>
  );
};

/**
 * Hook to access the cart store with a selector
 * Must be used within CartStoreProvider
 * Handles SSR by returning default state until hydrated
 */
export const useCartStore = <T,>(selector: (store: CartStore) => T): T => {
  const cartStoreContext = useContext(CartStoreContext);

  if (!cartStoreContext) {
    throw new Error("useCartStore must be used within CartStoreProvider");
  }

  return useStore(cartStoreContext, selector);
};

// ============================================
// Convenience Hooks
// ============================================

/**
 * Get all cart items
 */
const EMPTY_CART_ITEMS: CartState["items"] = [];

export const useCartItems = () => {
  const { isLoaded, userId } = useAuth();
  return useCartStore((state) =>
    isLoaded &&
    userId &&
    state.ownerUserId === userId &&
    state.isSynced
      ? state.items
      : EMPTY_CART_ITEMS,
  );
};

export const useCartReady = () => {
  const { isLoaded, userId } = useAuth();
  const ownerUserId = useCartStore((state) => state.ownerUserId);
  const isSynced = useCartStore((state) => state.isSynced);
  return Boolean(isLoaded && (!userId || (ownerUserId === userId && isSynced)));
};

/**
 * Get cart open state
 */
export const useCartIsOpen = () => useCartStore((state) => state.isOpen);

/**
 * Get total number of items in cart
 */
export const useTotalItems = () =>
  useCartItems().reduce((sum, item) => sum + item.quantity, 0);

/**
 * Get total price of cart
 */
export const useTotalPrice = () =>
  useCartItems().reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

/**
 * Find a specific item in cart
 */
export const useCartItem = (productId: string) =>
  useCartItems().find((item) => item.productId === productId);

/**
 * Get all cart actions
 * Actions are stable references from zustand, safe to destructure
 */
export const useCartActions = () => {
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);

  return {
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
  };
};
