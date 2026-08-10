import type { SaleItem } from "@/store/shop";
import { isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";

/**
 * Persistent in-progress carts on the Sales page.
 *
 * "cash" — items being prepared for an immediate cash sale
 * "due"  — items being prepared for a credit / due entry
 *
 * These are NOT confirmed transactions. They represent unsubmitted work that
 * survives reloads, so we can warn before letting the user delete a product
 * referenced by an open draft.
 */

export type DraftKind = "cash" | "due";

export type DraftCart = {
  kind: DraftKind;
  customer: string;
  items: SaleItem[];
  updatedAt: string; // ISO
};

export const DRAFTS_KEY = "medishop-drafts-v1";

type DraftsShape = Partial<Record<DraftKind, DraftCart>>;

export function loadDrafts(): DraftsShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as DraftsShape) : {};
  } catch {
    return {};
  }
}

export function saveDraft(kind: DraftKind, draft: Omit<DraftCart, "kind" | "updatedAt">) {
  if (typeof window === "undefined") return;
  if (isReadOnly()) { notifyReadOnlyBlocked(); return; }
  const all = loadDrafts();
  if (draft.items.length === 0 && !draft.customer.trim()) {
    delete all[kind];
  } else {
    all[kind] = {
      kind,
      customer: draft.customer,
      items: draft.items,
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
    // Notify same-tab listeners (storage event only fires across tabs).
    window.dispatchEvent(new Event("medishop-drafts-changed"));
  } catch {
    // ignore quota / privacy errors
  }
}

export function clearDraft(kind: DraftKind) {
  if (typeof window === "undefined") return;
  if (isReadOnly()) { notifyReadOnlyBlocked(); return; }
  const all = loadDrafts();
  if (!(kind in all)) return;
  delete all[kind];
  try {
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("medishop-drafts-changed"));
  } catch {
    // ignore
  }
}

export type DraftReference = {
  kind: DraftKind;
  customer: string;
  qty: number;
};

/**
 * Find every open draft cart that references the given product, with the
 * total quantity reserved in each cart. Empty array means safe to delete.
 */
export function findDraftReferences(productId: string): DraftReference[] {
  const all = loadDrafts();
  const refs: DraftReference[] = [];
  (Object.values(all) as DraftCart[]).forEach((d) => {
    if (!d || !Array.isArray(d.items)) return;
    const qty = d.items
      .filter((it) => it.productId === productId)
      .reduce((s, it) => s + it.qty, 0);
    if (qty > 0) {
      refs.push({ kind: d.kind, customer: d.customer || "Walk-in", qty });
    }
  });
  return refs;
}

/**
 * Remove a product from one draft (or all drafts when `kind` is omitted).
 * If a draft becomes empty AND has no customer text, it is dropped entirely
 * to keep the storage clean. Returns the number of drafts touched.
 */
export function removeProductFromDrafts(productId: string, kind?: DraftKind): number {
  if (typeof window === "undefined") return 0;
  if (isReadOnly()) { notifyReadOnlyBlocked(); return 0; }
  const all = loadDrafts();
  let touched = 0;
  const targets: DraftKind[] = kind ? [kind] : (Object.keys(all) as DraftKind[]);
  targets.forEach((k) => {
    const d = all[k];
    if (!d) return;
    const before = d.items.length;
    const items = d.items.filter((it) => it.productId !== productId);
    if (items.length === before) return;
    touched += 1;
    if (items.length === 0 && !d.customer.trim()) {
      delete all[k];
    } else {
      all[k] = { ...d, items, updatedAt: new Date().toISOString() };
    }
  });
  if (touched > 0) {
    try {
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
      window.dispatchEvent(new Event("medishop-drafts-changed"));
    } catch {
      // ignore
    }
  }
  return touched;
}

