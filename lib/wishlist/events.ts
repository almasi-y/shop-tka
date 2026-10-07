export const WISHLIST_UPDATED_EVENT = "wishlist-updated";

export function notifyWishlistUpdated() {
  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
}

