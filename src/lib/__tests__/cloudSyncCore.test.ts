import { describe, expect, it } from "vitest";
import {
  applyRemote,
  dirtyRows,
  emptyMeta,
  markPushed,
  recordsOf,
  sortNewestFirst,
  stable,
  stampLocal,
  type Live,
  type RemoteRow,
  type SyncMeta,
} from "../cloudSyncCore";

const rec = (o: unknown) => stable(o);
const live = (entries: Record<string, unknown>): Live =>
  Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, rec(v)]));

describe("stable", () => {
  it("gives the same text whatever the key order", () => {
    expect(stable({ b: 1, a: { d: 2, c: 3 } })).toBe(stable({ a: { c: 3, d: 2 }, b: 1 }));
  });
});

describe("stampLocal", () => {
  it("marks new and changed records dirty with the current time", () => {
    const first = stampLocal(emptyMeta(), live({ "sales:s1": { id: "s1", total: 10 } }), 100).meta;
    expect(first.records["sales:s1"]).toMatchObject({ ts: 100, dirty: true, deleted: false });

    const synced = markPushed(first, dirtyRows(first));
    const same = stampLocal(synced, live({ "sales:s1": { id: "s1", total: 10 } }), 200).meta;
    expect(same.records["sales:s1"]).toMatchObject({ ts: 100, dirty: false }); // untouched

    const edited = stampLocal(synced, live({ "sales:s1": { id: "s1", total: 12 } }), 300).meta;
    expect(edited.records["sales:s1"]).toMatchObject({ ts: 300, dirty: true });
  });

  it("turns a removed record into a tombstone", () => {
    const meta = stampLocal(emptyMeta(), live({ "products:p1": { id: "p1" }, "products:p2": { id: "p2" } }), 100).meta;
    const next = stampLocal(markPushed(meta, dirtyRows(meta)), live({ "products:p2": { id: "p2" } }), 200);
    expect(next.meta.records["products:p1"]).toMatchObject({ deleted: true, ts: 200, dirty: true, json: null });
    expect(next.suspicious).toEqual([]);
  });

  it("brings a record back to life when it reappears (undo of a delete)", () => {
    let meta = stampLocal(emptyMeta(), live({ "products:p1": { id: "p1" } }), 100).meta;
    meta = stampLocal(meta, {}, 200).meta; // 1 of 1 vanished, but below the mass-loss minimum
    expect(meta.records["products:p1"].deleted).toBe(true);
    meta = stampLocal(meta, live({ "products:p1": { id: "p1" } }), 300).meta;
    expect(meta.records["products:p1"]).toMatchObject({ deleted: false, ts: 300, dirty: true });
  });

  it("does not treat most of a collection vanishing at once as a delete", () => {
    const items: Record<string, unknown> = {};
    for (let i = 0; i < 10; i++) items[`sales:s${i}`] = { id: `s${i}` };
    const meta = markPushed(stampLocal(emptyMeta(), live(items), 100).meta, dirtyRows(stampLocal(emptyMeta(), live(items), 100).meta));
    const res = stampLocal(meta, live({ "sales:s0": { id: "s0" } }), 200);
    expect(res.suspicious).toEqual(["sales"]);
    expect(Object.values(res.meta.records).some((t) => t.deleted)).toBe(false);
    expect(Object.keys(res.meta.records)).toEqual(["sales:s0"]); // the rest is forgotten, to be restored from the cloud
  });
});

describe("applyRemote", () => {
  const row = (over: Partial<RemoteRow> & { id: string; ts: number }): RemoteRow => ({
    coll: "products",
    data: { id: over.id, name: "x" },
    deleted: false,
    ...over,
  });

  it("adds records the device does not have", () => {
    const res = applyRemote(emptyMeta(), {}, [row({ id: "p1", ts: 50 })]);
    expect(Object.keys(res.live)).toEqual(["products:p1"]);
    expect(res.meta.records["products:p1"]).toMatchObject({ ts: 50, dirty: false });
    expect([...res.changed]).toEqual(["products"]);
  });

  it("keeps a newer local edit and ignores an older cloud copy", () => {
    const meta = stampLocal(emptyMeta(), live({ "products:p1": { id: "p1", name: "local" } }), 100).meta;
    const res = applyRemote(meta, live({ "products:p1": { id: "p1", name: "local" } }), [
      row({ id: "p1", ts: 90, data: { id: "p1", name: "cloud" } }),
    ]);
    expect(JSON.parse(res.live["products:p1"]).name).toBe("local");
    expect(res.meta.records["products:p1"].dirty).toBe(true);
    expect(res.changed.size).toBe(0);
  });

  it("takes a newer cloud edit", () => {
    const meta = stampLocal(emptyMeta(), live({ "products:p1": { id: "p1", name: "local" } }), 100).meta;
    const res = applyRemote(meta, live({ "products:p1": { id: "p1", name: "local" } }), [
      row({ id: "p1", ts: 150, data: { id: "p1", name: "cloud" } }),
    ]);
    expect(JSON.parse(res.live["products:p1"]).name).toBe("cloud");
    expect(res.meta.records["products:p1"]).toMatchObject({ ts: 150, dirty: false });
  });

  it("applies a newer delete and ignores an older one", () => {
    const meta = markPushed(
      stampLocal(emptyMeta(), live({ "sales:s1": { id: "s1" } }), 100).meta,
      [{ coll: "sales", id: "s1", data: {}, deleted: false, ts: 100 }],
    );
    const older = applyRemote(meta, live({ "sales:s1": { id: "s1" } }), [row({ coll: "sales", id: "s1", ts: 90, deleted: true, data: null })]);
    expect("sales:s1" in older.live).toBe(true);
    const newer = applyRemote(meta, live({ "sales:s1": { id: "s1" } }), [row({ coll: "sales", id: "s1", ts: 120, deleted: true, data: null })]);
    expect("sales:s1" in newer.live).toBe(false);
    expect(newer.meta.records["sales:s1"]).toMatchObject({ deleted: true, dirty: false });
  });

  it("on an equal time the cloud copy wins, so devices converge", () => {
    const meta = stampLocal(emptyMeta(), live({ "products:p1": { id: "p1", name: "a" } }), 100).meta;
    const res = applyRemote(meta, live({ "products:p1": { id: "p1", name: "a" } }), [
      row({ id: "p1", ts: 100, data: { id: "p1", name: "b" } }),
    ]);
    expect(JSON.parse(res.live["products:p1"]).name).toBe("b");
  });
});

describe("two devices", () => {
  /** Stands in for the cloud table: last write wins per record. */
  const cloud = new Map<string, RemoteRow>();
  const pushTo = (meta: SyncMeta) => {
    const rows = dirtyRows(meta);
    for (const r of rows) {
      const k = `${r.coll}:${r.id}`;
      if (!cloud.has(k) || cloud.get(k)!.ts < r.ts) cloud.set(k, r);
    }
    return markPushed(meta, rows);
  };
  const sync = (meta: SyncMeta, l: Live, now: number) => {
    const stamped = stampLocal(meta, l, now);
    const merged = applyRemote(stamped.meta, l, [...cloud.values()]);
    return { meta: pushTo(merged.meta), live: merged.live };
  };

  it("a sale made on one device shows up on the other, and a delete follows", () => {
    cloud.clear();
    let a = { meta: emptyMeta(), live: live({ "sales:s1": { id: "s1", date: "2026-01-01", total: 50 } }) };
    let b = { meta: emptyMeta(), live: {} as Live };

    a = sync(a.meta, a.live, 100);
    b = sync(b.meta, b.live, 110);
    expect(Object.keys(b.live)).toEqual(["sales:s1"]);

    // B deletes it, A syncs.
    b = sync(b.meta, {}, 200);
    a = sync(a.meta, a.live, 210);
    expect(Object.keys(a.live)).toEqual([]);
  });

  it("edits to different records on both devices are both kept", () => {
    cloud.clear();
    let a = sync(emptyMeta(), live({ "sales:a1": { id: "a1" } }), 100);
    let b = sync(emptyMeta(), live({ "sales:b1": { id: "b1" } }), 101);
    a = sync(a.meta, a.live, 200);
    b = sync(b.meta, b.live, 201);
    expect(Object.keys(a.live).sort()).toEqual(["sales:a1", "sales:b1"]);
    expect(Object.keys(b.live).sort()).toEqual(["sales:a1", "sales:b1"]);
  });
});

describe("dirtyRows / markPushed", () => {
  it("only clears records that were not edited again while pushing", () => {
    let meta = stampLocal(emptyMeta(), live({ "sales:s1": { id: "s1", total: 1 } }), 100).meta;
    const sent = dirtyRows(meta);
    meta = stampLocal(meta, live({ "sales:s1": { id: "s1", total: 2 } }), 150).meta; // edited during the push
    meta = markPushed(meta, sent);
    expect(meta.records["sales:s1"].dirty).toBe(true);
  });
});

describe("rebuilding lists", () => {
  it("sorts sales newest first by date and products by last edit", () => {
    const l = live({
      "sales:old": { id: "old", date: "2026-01-01T00:00:00Z" },
      "sales:new": { id: "new", date: "2026-03-01T00:00:00Z" },
      "products:a": { id: "a" },
      "products:b": { id: "b" },
    });
    const meta: SyncMeta = {
      cursor: null,
      records: {
        "sales:old": { ts: 1, json: l["sales:old"], deleted: false, dirty: false },
        "sales:new": { ts: 2, json: l["sales:new"], deleted: false, dirty: false },
        "products:a": { ts: 5, json: l["products:a"], deleted: false, dirty: false },
        "products:b": { ts: 9, json: l["products:b"], deleted: false, dirty: false },
      },
    };
    expect((sortNewestFirst("sales", recordsOf(l, meta, "sales")) as { id: string }[]).map((s) => s.id)).toEqual(["new", "old"]);
    expect((sortNewestFirst("products", recordsOf(l, meta, "products")) as { id: string }[]).map((s) => s.id)).toEqual(["b", "a"]);
  });
});
