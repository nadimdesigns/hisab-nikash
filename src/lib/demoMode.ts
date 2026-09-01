/**
 * Demo sandbox (read-only viewing aid, re-added by owner request Aug 2026).
 * The app stays admin-only — there is no "user"/"demo" role anymore. Demo
 * mode is purely a client-side viewing sandbox: every persisted key gets a
 * `demo:` prefix so the visitor browses seeded sample data without ever
 * touching real records.
 */

const DEMO_KEY = "pharmasee-demo-mode";
const DEMO_PREFIX = "demo:";

export const DEMO_EMAIL = "demo@hisabnikash.local";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDemoMode(): void {
  try {
    window.localStorage.setItem(DEMO_KEY, "1");
  } catch {
    /* ignore quota */
  }
}

export function disableDemoMode(): void {
  try {
    window.localStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
}

/** Persisted keys are namespaced while demo mode is active. */
export function dataKey(key: string): string {
  return isDemoMode() ? `${DEMO_PREFIX}${key}` : key;
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

/** Admin-only app: no read-only users (demo writes to its own namespace). */
export function isReadOnly(): boolean {
  return false;
}

export function notifyReadOnlyBlocked(): void {
  /* no-op */
}
