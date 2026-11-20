export const OPEN_QUICK_SEARCH_EVENT = "medishop-open-quick-search";

/** Programmatically open the global product/customer quick-search dialog. */
export function openProductQuickSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_QUICK_SEARCH_EVENT));
}
