/**
 * Demo Mode
 * ----------
 * A purely client-side "demo account" that lets visitors explore the app
 * with sample data without touching real (admin) data.
 *
 * - Login with username `demo` / password `demo1` toggles the flag.
 * - When the flag is set, all persistent data keys (zustand store, dues, etc.)
 *   are namespaced with a `demo:` prefix so changes never leak into real
 *   admin storage on the same browser.
 * - The flag is read synchronously at module load time so the persisted
 *   stores can pick the right key immediately.
 */

const DEMO_FLAG_KEY = "pharmasee-demo-mode";
export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "demo1";
export const DEMO_EMAIL = "demo@pharmasee.local";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDemoMode(): void {
  try {
    window.localStorage.setItem(DEMO_FLAG_KEY, "1");
  } catch {
    /* ignore quota */
  }
}

export function disableDemoMode(): void {
  try {
    window.localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Returns the given storage key, namespaced with `demo:` when demo mode is
 * active. Use this for ALL persistent data keys so demo edits stay isolated
 * from admin data on the same device.
 */
export function dataKey(key: string): string {
  return isDemoMode() ? `demo:${key}` : key;
}

/**
 * Demo accounts are strictly read-only — they can browse every page but
 * cannot mutate any persisted data. Call this from any write path; when it
 * returns true, abort the write and surface a toast so the user understands
 * why nothing happened.
 */
/**
 * Cached server-side role for the signed-in user. We mirror it to
 * localStorage so the sync `isReadOnly()` check used inside zustand store
 * mutations can answer without awaiting an async role lookup.
 */
const ROLE_CACHE_KEY = "pharmasee-user-role";
export type CachedRole = "admin" | "demo" | "user";

export function getCachedRole(): CachedRole | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(ROLE_CACHE_KEY);
    return v === "admin" || v === "demo" || v === "user" ? v : null;
  } catch {
    return null;
  }
}

export function setCachedRole(role: CachedRole | null): void {
  try {
    if (role) window.localStorage.setItem(ROLE_CACHE_KEY, role);
    else window.localStorage.removeItem(ROLE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function isReadOnly(): boolean {
  return isDemoMode() || getCachedRole() === "demo";
}

let lastReadOnlyToastAt = 0;
/**
 * Show a single toast explaining that the demo account is read-only.
 * Debounced so a burst of blocked writes (e.g. rapid clicks) collapses
 * into one notification.
 */
export function notifyReadOnlyBlocked(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastReadOnlyToastAt < 1500) return;
  lastReadOnlyToastAt = now;
  // Lazy import to avoid a hard dependency cycle with the toast hook.
  import("@/hooks/use-toast").then(({ toast }) => {
    toast({
      title: "Demo mode",
      description: "This is a read-only demo account — changes are not saved.",
    });
  }).catch(() => {
    /* ignore */
  });
}
