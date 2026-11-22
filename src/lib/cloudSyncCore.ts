/**
 * Pure logic of the cloud sync (no network, no storage): which records changed on this device,
 * how records from the cloud are merged in, and what still has to be pushed.
 *
 * The shop's data is a set of records, each identified by `coll:id`:
 *   products, sales, purchases   (the zustand shop store)
 *   dues, payments               (arrays in localStorage)
 *   profiles                     (customer profiles, one record per customer name)
 *   meta                         (settings, e.g. the shop type)
 *
 * Every record carries `ts`, the time (ms) of its last edit, and conflicts are settled per
 * record, last write wins. The stores themselves know nothing about sync, so edits are found by
 * comparing the current records with what was last seen (`stampLocal`): a record whose content
 * changed gets a new `ts`, a record that vanished becomes a tombstone (so another device removes
 * it too instead of bringing it back).
 */

export const COLLS = ["products", "sales", "purchases", "dues", "payments", "profiles", "meta"] as const;
export type Coll = (typeof COLLS)[number];

/** What this device knows about one record. `json` is the record as stable JSON (null when deleted). */
export type Tracked = { ts: number; json: string | null; deleted: boolean; dirty: boolean };

export type SyncMeta = {
  /** Latest server time (`synced_at`) seen when pulling; the next pull asks for newer rows. */
  cursor: string | null;
  records: Record<string, Tracked>;
};

/** A row as stored in the cloud. */
export type RemoteRow = { coll: Coll; id: string; data: unknown; deleted: boolean; ts: number };

/** Records currently on this device: `coll:id` -> stable JSON. */
export type Live = Record<string, string>;

export const emptyMeta = (): SyncMeta => ({ cursor: null, records: {} });

export const keyOf = (coll: Coll, id: string): string => `${coll}:${id}`;

export function splitKey(key: string): { coll: Coll; id: string } {
  const i = key.indexOf(":");
  return { coll: key.slice(0, i) as Coll, id: key.slice(i + 1) };
}

/** JSON with sorted object keys, so the same record always gives the same text. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

/** A collection suddenly losing most of its records (storage cleared, store not loaded) is not a user's delete. */
const MASS_LOSS_MIN = 6;
const MASS_LOSS_SHARE = 0.5;

export type StampResult = {
  meta: SyncMeta;
  /** Collections that lost most of their records at once: not treated as deletes, restored from the cloud instead. */
  suspicious: Coll[];
};

/**
 * Compares the records on the device with what was last seen and stamps the differences:
 * new / changed -> `ts = now`, dirty; gone -> tombstone with `ts = now`, dirty.
 */
export function stampLocal(prev: SyncMeta, live: Live, now: number): StampResult {
  const records: Record<string, Tracked> = { ...prev.records };

  // Records that disappeared since the last look.
  const gone: string[] = [];
  const trackedLive: Record<string, number> = {};
  for (const [key, t] of Object.entries(prev.records)) {
    if (t.deleted) continue;
    const { coll } = splitKey(key);
    trackedLive[coll] = (trackedLive[coll] ?? 0) + 1;
    if (!(key in live)) gone.push(key);
  }
  const goneByColl: Record<string, string[]> = {};
  for (const key of gone) (goneByColl[splitKey(key).coll] ??= []).push(key);

  const suspicious: Coll[] = [];
  for (const [coll, keys] of Object.entries(goneByColl)) {
    if (keys.length >= MASS_LOSS_MIN && keys.length >= (trackedLive[coll] ?? 0) * MASS_LOSS_SHARE) {
      suspicious.push(coll as Coll);
      // Forget them: the cloud copy (if there is one) comes back as "new" on the next pull.
      for (const key of keys) delete records[key];
    } else {
      for (const key of keys) records[key] = { ts: now, json: null, deleted: true, dirty: true };
    }
  }

  // New and changed records.
  for (const [key, json] of Object.entries(live)) {
    const t = records[key];
    if (!t || t.deleted || t.json !== json) {
      records[key] = { ts: now, json, deleted: false, dirty: true };
    }
  }

  return { meta: { ...prev, records }, suspicious };
}

export type MergeResult = {
  meta: SyncMeta;
  live: Live;
  /** Collections whose records changed because of what came from the cloud. */
  changed: Set<Coll>;
};

/**
 * Merges rows from the cloud into the device's records. A newer edit wins; on an equal time the
 * cloud's version wins (so every device ends up with the same data).
 */
export function applyRemote(prev: SyncMeta, live: Live, rows: RemoteRow[]): MergeResult {
  const records: Record<string, Tracked> = { ...prev.records };
  const nextLive: Live = { ...live };
  const changed = new Set<Coll>();

  for (const row of rows) {
    if (!COLLS.includes(row.coll)) continue;
    const key = keyOf(row.coll, row.id);
    const t = records[key];
    const json = row.deleted ? null : stable(row.data);
    if (t) {
      if (t.ts > row.ts) continue; // this device's edit is newer; it gets pushed
      if (t.ts === row.ts && t.json === json && t.deleted === row.deleted) {
        // Already identical: just make sure it is not marked as unsynced.
        records[key] = { ...t, dirty: false };
        continue;
      }
    }
    records[key] = { ts: row.ts, json, deleted: row.deleted, dirty: false };
    if (row.deleted) {
      if (key in nextLive) {
        delete nextLive[key];
        changed.add(row.coll);
      }
    } else if (nextLive[key] !== json) {
      nextLive[key] = json as string;
      changed.add(row.coll);
    }
  }

  return { meta: { ...prev, records }, live: nextLive, changed };
}

export type PushRow = { coll: Coll; id: string; data: unknown; deleted: boolean; ts: number };

/** Records edited on this device that the cloud has not got yet. */
export function dirtyRows(meta: SyncMeta): PushRow[] {
  const rows: PushRow[] = [];
  for (const [key, t] of Object.entries(meta.records)) {
    if (!t.dirty) continue;
    const { coll, id } = splitKey(key);
    rows.push({ coll, id, data: t.json === null ? null : JSON.parse(t.json), deleted: t.deleted, ts: t.ts });
  }
  return rows;
}

/** After a successful push: records that were not edited again meanwhile are in sync. */
export function markPushed(meta: SyncMeta, sent: PushRow[]): SyncMeta {
  const records = { ...meta.records };
  for (const row of sent) {
    const key = keyOf(row.coll, row.id);
    const t = records[key];
    if (t && t.dirty && t.ts === row.ts) records[key] = { ...t, dirty: false };
  }
  return { ...meta, records };
}

/** The records of one collection as parsed objects (for rebuilding the local stores). */
export function recordsOf(live: Live, meta: SyncMeta, coll: Coll): { id: string; value: unknown; ts: number }[] {
  const prefix = `${coll}:`;
  const out: { id: string; value: unknown; ts: number }[] = [];
  for (const [key, json] of Object.entries(live)) {
    if (!key.startsWith(prefix)) continue;
    out.push({ id: key.slice(prefix.length), value: JSON.parse(json), ts: meta.records[key]?.ts ?? 0 });
  }
  return out;
}

const dateMs = (v: unknown): number => {
  const d = (v as { date?: string } | null)?.date;
  const t = d ? Date.parse(d) : NaN;
  return Number.isFinite(t) ? t : 0;
};

/** Newest first, the way the app keeps its lists. Products: most recently added/edited first. */
export function sortNewestFirst(coll: Coll, items: { id: string; value: unknown; ts: number }[]): unknown[] {
  const sorted = [...items];
  if (coll === "products") sorted.sort((a, b) => b.ts - a.ts);
  else sorted.sort((a, b) => dateMs(b.value) - dateMs(a.value) || b.ts - a.ts);
  return sorted.map((i) => i.value);
}
