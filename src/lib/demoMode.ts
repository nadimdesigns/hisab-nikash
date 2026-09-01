/**
 * Role support simplified to admin-only (owner instruction, Aug 2026):
 * demo mode and the read-only "user" role were removed. These exports stay
 * as inert shims so every legacy call site compiles and behaves as before
 * minus the demo/user branches — `dataKey` is now an identity, demo mode is
 * always off, and no user is ever read-only.
 */

export const DEMO_EMAIL = "";

export function isDemoMode(): boolean {
  return false;
}

export function enableDemoMode(): void {
  /* removed — demo mode no longer exists */
}

export function disableDemoMode(): void {
  /* removed */
}

/** Persisted storage keys are no longer namespaced per role. */
export function dataKey(key: string): string {
  return key;
}

export type CachedRole = "admin" | null;

export function getCachedRole(): CachedRole | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("hisab-nikash-role") === "admin" ? "admin" : null;
  } catch {
    return null;
  }
}

export function setCachedRole(role: CachedRole | null): void {
  try {
    if (role) window.localStorage.setItem("hisab-nikash-role", role);
    else window.localStorage.removeItem("hisab-nikash-role");
  } catch {
    /* ignore quota */
  }
}

/** Admin-only app: no read-only users. */
export function isReadOnly(): boolean {
  return false;
}

export function notifyReadOnlyBlocked(): void {
  /* no-op */
}
