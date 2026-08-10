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

/**
 * Whether writes should be blocked for the current user.
 *
 * Note this is deliberately NOT true for the local demo login. Demo mode
 * already namespaces every persisted key with `demo:` (see `dataKey`), so a
 * demo user physically cannot touch real data on the same browser — the
 * read-only guard added no safety on top of that, and made the demo useless
 * for its actual purpose: trying the app out. A demo visitor can now record
 * sales, add stock and settle বাকি against their own sandboxed copy, and
 * clear it all by logging out.
 *
 * A server-assigned `demo` role is still read-only. That one is handed out
 * deliberately to accounts sharing real data, where the restriction is the
 * point. Being client-side it is only a UI affordance, not a security
 * boundary — RLS is what will actually enforce this once shop data moves to
 * Postgres.
 */
export function isReadOnly(): boolean {
  return getCachedRole() === "demo";
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
