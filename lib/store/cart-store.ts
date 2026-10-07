import { createStore } from "zustand/vanilla";

// Types
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug?: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  ownerUserId: string | null;
  isSynced: boolean;
}

export interface CartActions {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  replaceCart: (
    ownerUserId: string | null,
    items: CartItem[],
    isSynced: boolean,
  ) => void;
}

export type CartStore = CartState & CartActions;

// Default state
export const defaultInitState: CartState = {
  items: [],
  isOpen: false,
  ownerUserId: null,
  isSynced: true,
};

/**
 * Cart store factory - creates new store instance per provider
 * Persistence is handled by the authenticated cart provider and the server API.
 * The store itself never writes account data to shared browser storage.
 */
export const createCartStore = (initState: CartState = defaultInitState) => {
  return createStore<CartStore>()((set, get) => ({
    ...initState,

    addItem: (item, quantity = 1) =>
      set((state) => {
        if (!state.ownerUserId || !state.isSynced) return state;
        const existing = state.items.find(
          (i) => i.productId === item.productId,
        );
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            ),
          };
        }
        return { items: [...state.items, { ...item, quantity }] };
      }),

    removeItem: (productId) =>
      set((state) => ({
        items: state.items.filter((i) => i.productId !== productId),
      })),

    updateQuantity: (productId, quantity) =>
      set((state) => {
        if (quantity <= 0) {
          return {
            items: state.items.filter((i) => i.productId !== productId),
          };
        }
        return {
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        };
      }),

    clearCart: () => set({ items: [] }),
    toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    openCart: () => set({ isOpen: true }),
    closeCart: () => {
      if (get().isOpen) {
        set({ isOpen: false });
      }
    },
    replaceCart: (ownerUserId, items, isSynced) =>
      set({ ownerUserId, items, isSynced, isOpen: false }),
  }));
};
