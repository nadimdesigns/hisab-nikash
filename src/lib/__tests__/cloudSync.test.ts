import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the cloud table, with the same last-write-wins rule as the SQL function.
type Row = { user_id: string; coll: string; id: string; data: unknown; deleted: boolean; ts: number; synced_at: string };
const cloud: Row[] = [];
let tick = 0;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    from: () => {
      let after = "";
      const q = {
        select: () => q,
        gt: (_c: string, v: string) => {
          after = v;
          return q;
        },
        order: () => q,
        limit: async () => ({
          data: cloud.filter((r) => r.synced_at > after).sort((a, b) => (a.synced_at < b.synced_at ? -1 : 1)),
          error: null,
        }),
      };
      return q;
    },
    rpc: async (_name: string, { records }: { records: { coll: string; id: string; data: unknown; deleted: boolean; ts: number }[] }) => {
      let written = 0;
      for (const r of records) {
        const found = cloud.find((c) => c.coll === r.coll && c.id === r.id);
        const synced_at = new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + ++tick * 1000).toISOString();
        if (!found) {
          cloud.push({ user_id: "u1", ...r, data: r.deleted ? null : r.data, synced_at });
          written++;
        } else if (found.ts < r.ts) {
          Object.assign(found, { data: r.deleted ? null : r.data, deleted: r.deleted, ts: r.ts, synced_at });
          written++;
        }
      }
      return { data: written, error: null };
    },
  },
}));

localStorage.setItem("hisab-nikash-active-account", "u1");

describe("cloud sync (two devices, one account)", () => {
  beforeEach(() => {
    cloud.length = 0;
    tick = 0;
  });

  it("uploads this device's data and brings it to a fresh device", async () => {
    const { syncNow } = await import("../cloudSync");
    const { useShop } = await import("@/store/shop");
    const { DUES_KEY } = await import("@/lib/customerPayments");
    const { PAYMENTS_KEY } = await import("@/lib/customerPaymentsLog");
    const { PROFILES_KEY } = await import("@/lib/customerProfiles");

    // Device A: a product, a sale, a due, a payment and a customer profile.
    const product = { id: "p1", name: "চাল", sku: "C", category: "চাল", unit: "kg", batch: "", expiry: "", stock: 10, reorderLevel: 1, costPrice: 5, sellPrice: 8 };
    const sale = { id: "s1", date: "2026-03-01T10:00:00.000Z", customer: "রহিম", items: [], total: 80, cost: 50 };
    useShop.setState({ products: [product] as never, sales: [sale] as never, purchases: [] });
    localStorage.setItem(DUES_KEY, JSON.stringify([{ id: "d1", date: "2026-03-02T10:00:00.000Z", customer: "করিম", total: 40 }]));
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([{ id: "pay1", date: "2026-03-03T10:00:00.000Z", customer: "করিম", amount: 10 }]));
    localStorage.setItem(PROFILES_KEY, JSON.stringify({ রহিম: { phone: "017" } }));

    await syncNow();
    expect(cloud.map((r) => `${r.coll}:${r.id}`).sort()).toEqual(
      ["dues:d1", "payments:pay1", "products:p1", "profiles:রহিম", "sales:s1"].sort(),
    );

    // Device B: nothing local, same account.
    useShop.setState({ products: [], sales: [], purchases: [] });
    for (const k of [DUES_KEY, PAYMENTS_KEY, PROFILES_KEY, "acct:u1:hisab-nikash-sync-v1"]) localStorage.removeItem(k);
    const seen: string[] = [];
    window.addEventListener("storage", (e) => e.key && seen.push(e.key));

    await syncNow();
    expect(useShop.getState().products.map((p) => p.id)).toEqual(["p1"]);
    expect(useShop.getState().sales.map((s) => s.id)).toEqual(["s1"]);
    expect(JSON.parse(localStorage.getItem(DUES_KEY) ?? "[]")).toEqual([{ id: "d1", date: "2026-03-02T10:00:00.000Z", customer: "করিম", total: 40 }]);
    expect(JSON.parse(localStorage.getItem(PAYMENTS_KEY) ?? "[]")).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "{}")).toEqual({ রহিম: { phone: "017" } });
    expect(seen).toEqual(expect.arrayContaining([DUES_KEY, PAYMENTS_KEY, PROFILES_KEY])); // open screens refresh

    // Nothing was edited on B, so a second sync pushes nothing.
    const before = JSON.stringify(cloud);
    await syncNow();
    expect(JSON.stringify(cloud)).toBe(before);
  });

  it("a delete on one device removes the record on the other", async () => {
    const { syncNow } = await import("../cloudSync");
    const { useShop } = await import("@/store/shop");
    const sale = { id: "sx", date: "2026-03-01T10:00:00.000Z", customer: "", items: [], total: 1, cost: 1 };
    useShop.setState({ products: [], sales: [sale] as never, purchases: [] });
    await syncNow();
    expect(cloud.find((r) => r.id === "sx")?.deleted).toBe(false);

    useShop.getState().deleteSale("sx");
    await syncNow();
    expect(cloud.find((r) => r.id === "sx")).toMatchObject({ deleted: true, data: null });
  });
});
