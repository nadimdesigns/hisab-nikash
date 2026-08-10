import { usePersistentState } from "@/hooks/use-persistent-state";

/**
 * Persistent UI preference: whether route navigations should animate the
 * scroll-to-top with smooth scrolling, or jump instantly (the default).
 *
 * Stored in localStorage under a stable key so the choice survives reloads
 * and is shared across tabs (the storage event will repaint dependent UI).
 */
const SMOOTH_SCROLL_KEY = "medishop-smooth-scroll";

const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

export function useSmoothScroll() {
  return usePersistentState<boolean>(SMOOTH_SCROLL_KEY, false, isBoolean);
}

/**
 * Synchronous read of the smooth-scroll preference for use outside of
 * React (e.g. inside the ScrollToTop effect, which runs on every route
 * change and needs the latest value without subscribing to state).
 */
export function readSmoothScrollPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(SMOOTH_SCROLL_KEY);
    if (raw === null) return false;
    const parsed = JSON.parse(raw);
    return typeof parsed === "boolean" ? parsed : false;
  } catch {
    return false;
  }
}
