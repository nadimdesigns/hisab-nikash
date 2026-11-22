import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/store/shop";
import { getActiveAccount, scopedKey } from "@/lib/accountScope";
import { isDemoMode } from "@/lib/demoMode";
import { DUES_KEY } from "@/lib/customerPayments";
import { PAYMENTS_KEY } from "@/lib/customerPaymentsLog";
import { PROFILES_KEY } from "@/lib/customerProfiles";
import {
  applyRemote,
  dirtyRows,
  emptyMeta,
  keyOf,
  markPushed,
  recordsOf,
  sortNewestFirst,
  stable,
  stampLocal,
  type Coll,
  type Live,
  type RemoteRow,
  type SyncMeta,
} from "@/lib/cloudSyncCore";

/**
 * Cloud sync of the shop's data, so signing in with the same phone number on another device shows
 * the same shop. The app still works offline from this device's own copy; whenever it is online it
 * pushes what changed here and pulls what changed elsewhere (table `hisab_nikash_records`, see
 * src/lib/cloudSyncCore.ts for the merge rules).
 *
 * Runs on start-up, when the app comes back to the foreground or the network returns, shortly
 * after a local change, and every 20 s while the app is open.
 */

const META_KEY = "hisab-nikash-sync-v1";
const SHOP_TYPE_KEY = "hisab-nikash-shop-type";
const PAGE = 1000;
const PUSH_BATCH = 100;
/** Pull a little before the last seen server time so a row committed late is never missed. */
const CURSOR_OVERLAP_MS = 5000;
const POLL_MS = 20_000;
const LOCAL_CHECK_MS = 4000;

export type SyncState = "idle" | "syncing" | "offline" | "error";

export const useSyncStatus = create<{ state: SyncState; lastSyncedAt: number | null }>()(() => ({
  state: "idle",
  lastSyncedAt: null,
}));

const setStatus = (patch: Partial<{ state: SyncState; lastSyncedAt: number | null }>) => useSyncStatus.setState(patch);

// ---- local storage of the sync bookkeeping ------------------------------------------------

const metaKey = () => scopedKey(META_KEY);

function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(metaKey());
    const parsed = raw ? (JSON.parse(raw) as SyncMeta) : null;
    if (parsed && typeof parsed === "object" && parsed.records) return { cursor: parsed.cursor ?? null, records: parsed.records };
  } catch {
    /* start fresh */
  }
  return emptyMeta();
}

function saveMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(metaKey(), JSON.stringify(meta));
  } catch {
    /* storage full: the next run recomputes the differences */
  }
}

// ---- reading and writing the app's own stores ---------------------------------------------

const parse = <T>(raw: string | null, fallback: T): T => {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

function readLive(): Live {
  const live: Live = {};
  const shop = useShop.getState();
  for (const p of shop.products) live[keyOf("products", p.id)] = stable(p);
  for (const s of shop.sales) live[keyOf("sales", s.id)] = stable(s);
  for (const p of shop.purchases) live[keyOf("purchases", p.id)] = stable(p);

  const lists: [Coll, string][] = [
    ["dues", DUES_KEY],
    ["payments", PAYMENTS_KEY],
  ];
  for (const [coll, key] of lists) {
    const arr = parse<unknown[]>(localStorage.getItem(key), []);
    if (!Array.isArray(arr)) continue;
    for (const r of arr) {
      const id = (r as { id?: unknown } | null)?.id;
      if (typeof id === "string") live[keyOf(coll, id)] = stable(r);
    }
  }

  const profiles = parse<Record<string, unknown>>(localStorage.getItem(PROFILES_KEY), {});
  for (const [name, profile] of Object.entries(profiles ?? {})) live[keyOf("profiles", name)] = stable(profile);

  const shopType = localStorage.getItem(scopedKey(SHOP_TYPE_KEY));
  if (shopType) live[keyOf("meta", "shopType")] = stable({ value: shopType });
  return live;
}

/** Tells screens that keep their own copy (dues, payments, profiles) to reload it, like another tab's write would. */
function notifyStorage(key: string, newValue: string | null): void {
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue, storageArea: localStorage }));
  } catch {
    /* ignore */
  }
}

/** Puts the merged records of the changed collections into the app's stores. */
function writeBack(changed: Set<Coll>, live: Live, meta: SyncMeta): void {
  const patch: Partial<{ products: never[]; sales: never[]; purchases: never[] }> = {};
  for (const coll of ["products", "sales", "purchases"] as const) {
    if (changed.has(coll)) patch[coll] = sortNewestFirst(coll, recordsOf(live, meta, coll)) as never[];
  }
  if (Object.keys(patch).length > 0) useShop.setState(patch);

  for (const [coll, key] of [
    ["dues", DUES_KEY],
    ["payments", PAYMENTS_KEY],
  ] as [Coll, string][]) {
    if (!changed.has(coll)) continue;
    const text = JSON.stringify(sortNewestFirst(coll, recordsOf(live, meta, coll)));
    try {
      localStorage.setItem(key, text);
    } catch {
      continue;
    }
    notifyStorage(key, text);
  }

  if (changed.has("profiles")) {
    const profiles: Record<string, unknown> = {};
    for (const r of recordsOf(live, meta, "profiles")) profiles[r.id] = r.value;
    const text = JSON.stringify(profiles);
    try {
      localStorage.setItem(PROFILES_KEY, text);
      notifyStorage(PROFILES_KEY, text);
    } catch {
      /* ignore */
    }
  }

  if (changed.has("meta")) {
    const shopType = (recordsOf(live, meta, "meta").find((r) => r.id === "shopType")?.value as { value?: string } | undefined)?.value;
    if (shopType) {
      try {
        localStorage.setItem(scopedKey(SHOP_TYPE_KEY), shopType);
      } catch {
        /* ignore */
      }
    }
  }
}

// ---- network ------------------------------------------------------------------------------

async function pull(cursor: string | null): Promise<{ rows: RemoteRow[]; maxSynced: string | null }> {
  const rows: RemoteRow[] = [];
  let from = cursor ?? "1970-01-01T00:00:00Z";
  let maxSynced: string | null = null;
  for (let page = 0; page < 500; page++) {
    const { data, error } = await supabase
      .from("hisab_nikash_records")
      .select("coll,id,data,deleted,ts,synced_at")
      .gt("synced_at", from)
      .order("synced_at", { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({ coll: r.coll as Coll, id: r.id, data: r.data, deleted: r.deleted, ts: Number(r.ts) });
    }
    maxSynced = data[data.length - 1].synced_at;
    from = maxSynced;
    if (data.length < PAGE) break;
  }
  return { rows, maxSynced };
}

async function push(rows: ReturnType<typeof dirtyRows>): Promise<void> {
  for (let i = 0; i < rows.length; i += PUSH_BATCH) {
    const batch = rows.slice(i, i + PUSH_BATCH);
    const { error } = await supabase.rpc("hisab_nikash_sync_push", { records: batch as never });
    if (error) throw error;
  }
}

// ---- the sync itself ----------------------------------------------------------------------

let running = false;
let rerun = false;
let lastRunAt = 0;
let lastStamp = 0;

/** Edit times on this device only ever go up, so a later edit or delete always beats an earlier one (even within a millisecond). */
const nextStamp = (): number => {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
};

/** The signed-in real account whose data this device is currently showing, or null. */
async function currentAccount(): Promise<string | null> {
  if (isDemoMode()) return null;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  const active = getActiveAccount();
  return userId && active && userId === active ? userId : null;
}

/** Returns false when there was nothing to do (not signed in to a real account, stores not loaded yet). */
async function runOnce(): Promise<boolean> {
  if (!(await currentAccount())) return false;
  if (!useShop.persist.hasHydrated()) return false;

  // 1. Download what changed in the cloud. (No local reads yet: the app may change while we wait.)
  const before = loadMeta();
  const { rows, maxSynced } = await pull(before.cursor);

  // 2. Merge it in. Everything from reading the device's records to writing them back is synchronous,
  //    so an edit made while the download was running is stamped first and never overwritten.
  let meta = loadMeta();
  const live = readLive();
  const stamped = stampLocal(meta, live, nextStamp());
  meta = stamped.meta;
  if (stamped.suspicious.length > 0) meta = { ...meta, cursor: null }; // restore from the cloud, do not delete there
  const merged = applyRemote(meta, live, rows);
  meta = {
    ...merged.meta,
    cursor: maxSynced ? new Date(Date.parse(maxSynced) - CURSOR_OVERLAP_MS).toISOString() : meta.cursor,
  };
  if (merged.changed.size > 0) writeBack(merged.changed, merged.live, meta);
  saveMeta(meta);

  // 3. Upload what was edited on this device.
  const dirty = dirtyRows(meta);
  if (dirty.length > 0) {
    await push(dirty);
    meta = markPushed(meta, dirty);
    saveMeta(meta);
  }
  return true;
}

export async function syncNow(): Promise<void> {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  setStatus({ state: "syncing" });
  try {
    const synced = await runOnce();
    lastRunAt = Date.now();
    setStatus(synced ? { state: "idle", lastSyncedAt: Date.now() } : { state: "idle" });
  } catch {
    lastRunAt = Date.now();
    setStatus({ state: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error" });
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      void syncNow();
    }
  }
}

/** Something that changes whenever the shop's data on this device changes (cheap: no stringifying of records). */
const localSignature = () => {
  const shop = useShop.getState();
  const raw = [DUES_KEY, PAYMENTS_KEY, PROFILES_KEY, scopedKey(SHOP_TYPE_KEY)].map((k) => localStorage.getItem(k) ?? "").join("\u0000");
  return { products: shop.products, sales: shop.sales, purchases: shop.purchases, raw };
};
let lastSignature: ReturnType<typeof localSignature> | null = null;
const sameSignature = (a: ReturnType<typeof localSignature>, b: ReturnType<typeof localSignature> | null) =>
  !!b && a.products === b.products && a.sales === b.sales && a.purchases === b.purchases && a.raw === b.raw;

/** Cheap check (no network): is there anything edited on this device that the cloud does not have yet? */
async function syncIfNeeded(): Promise<void> {
  if (running) return;
  if (Date.now() - lastRunAt >= POLL_MS) return void syncNow();
  const signature = localSignature();
  if (sameSignature(signature, lastSignature)) return; // nothing changed since the last look
  lastSignature = signature;
  if (!(await currentAccount()) || !useShop.persist.hasHydrated()) return;
  if (running) return;
  const stamped = stampLocal(loadMeta(), readLive(), nextStamp());
  const hasChanges = dirtyRows(stamped.meta).length > 0 || stamped.suspicious.length > 0;
  if (hasChanges) void syncNow();
}

/** Starts the sync loop; returns a function that stops it. */
export function startCloudSync(): () => void {
  const visible = () => typeof document === "undefined" || !document.hidden;

  void syncNow();
  const poll = window.setInterval(() => {
    if (visible()) void syncIfNeeded();
  }, LOCAL_CHECK_MS);
  const onVisible = () => {
    if (visible()) void syncNow();
  };
  const onOnline = () => void syncNow();

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  let debounce: number | undefined;
  const unsubscribe = useShop.subscribe(() => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void syncIfNeeded(), 800);
  });

  return () => {
    window.clearInterval(poll);
    window.clearTimeout(debounce);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    unsubscribe();
  };
}

/** Mount once, inside the app: keeps this device's shop data and the cloud copy in step. */
export function useCloudSync(): void {
  useEffect(() => startCloudSync(), []);
}
