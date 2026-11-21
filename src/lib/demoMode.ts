import { scopedKey } from "@/lib/accountScope";
/**
 * Demo account management.
 * The demo account shares the primary live store keys so all changes (adding/editing
 * products, recording sales, payments, expenses) update the live preview directly.
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

/**
 * Persisted keys are unified with live storage so demo account edits
 * immediately update the live preview directly (not trapped in an isolated sandbox).
 * Also migrates any previous demo: prefixed keys to the main keys.
 */
export function dataKey(key: string): string {
  const scoped = scopedKey(key);
  if (scoped !== key) return scoped;
  if (typeof window !== "undefined") {
    try {
      const demoKey = `demo:${key}`;
      const demoVal = window.localStorage.getItem(demoKey);
      if (demoVal && !window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, demoVal);
      }
    } catch {
      /* ignore */
    }
  }
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

/** Admin-only app: no read-only users (demo writes to its own namespace). */
export function isReadOnly(): boolean {
  return false;
}

export function notifyReadOnlyBlocked(): void {
  /* no-op */
}
