export const GUEST_WISHLIST_STORAGE_KEY = "guest-wishlist-v1";

export function getGuestWishlist(): string[] {
  try {
    const value = window.localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function setGuestWishlist(productIds: string[]) {
  window.localStorage.setItem(
    GUEST_WISHLIST_STORAGE_KEY,
    JSON.stringify([...new Set(productIds)]),
  );
}

export function isGuestWishlisted(productId: string) {
  return getGuestWishlist().includes(productId);
}

export function toggleGuestWishlist(productId: string) {
  const productIds = getGuestWishlist();
  const isSaved = productIds.includes(productId);
  setGuestWishlist(
    isSaved
      ? productIds.filter((id) => id !== productId)
      : [...productIds, productId],
  );
  return !isSaved;
}

export function clearGuestWishlist() {
  window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
}
