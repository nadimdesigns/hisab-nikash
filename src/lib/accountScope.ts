/**
 * Every account's shop data (stock, sales, dues, customers, drafts, shop type) lives under its
 * own localStorage keys: `acct:<userId>:<key>`. Signing out and signing up as somebody else on
 * the same phone therefore never shows the previous shop's products.
 *
 * The scope is read when a module loads, so changing the active account is always followed by a
 * hard page reload (see `switchAccount`).
 */
const ACTIVE_KEY = "hisab-nikash-active-account";
const LEGACY_CLAIMED_KEY = "hisab-nikash-legacy-claimed";

/** Data keys that existed before per-account storage (shared, unscoped). */
export const DATA_KEYS = [
  "dokan-store-v1",
  "medishop-store-v2-bd",
  "medishop-dues-v1",
  "medishop-payments-v1",
  "medishop-customer-profiles-v1",
  "medishop-drafts-v1",
  "hisab-nikash-shop-type",
] as const;

export function getActiveAccount(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export const scopedKey = (key: string, accountId: string | null = getActiveAccount()): string =>
  accountId ? `acct:${accountId}:${key}` : key;

/**
 * Makes `accountId` the active account. A returning account on a phone that still has
 * pre-update (unscoped) data inherits it once; a brand-new account never does.
 */
export function activateAccount(accountId: string, opts: { isNew: boolean }): void {
  try {
    if (!opts.isNew && !localStorage.getItem(LEGACY_CLAIMED_KEY)) {
      for (const k of DATA_KEYS) {
        const v = localStorage.getItem(k);
        if (v !== null && localStorage.getItem(scopedKey(k, accountId)) === null) {
          localStorage.setItem(scopedKey(k, accountId), v);
        }
        localStorage.removeItem(k);
      }
      localStorage.setItem(LEGACY_CLAIMED_KEY, accountId);
    }
    localStorage.setItem(ACTIVE_KEY, accountId);
  } catch {
    /* storage unavailable */
  }
}
