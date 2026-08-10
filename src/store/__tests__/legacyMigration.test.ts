import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The rename from Medicine to Product changed both the persisted key and the
 * field names on every line item. A shopkeeper mid-use has real stock, sales
 * and dues under the old key, so the store runs a one-time migration at
 * import time. If that migration is wrong the failure is silent and total:
 * the app looks fine and simply shows an empty shop with seeded demo data
 * on top. These tests pin the behaviour down.
 */

const LEGACY_KEY = "medishop-store-v2-bd";
const STORE_KEY = "dokan-store-v1";

const legacyBlob = () =>
  JSON.stringify({
    version: 0,
    state: {
      medicines: [
        {
          id: "m1",
          name: "মিনিকেট চাল",
          sku: "CHAL-MINI",
          category: "চাল",
          batch: "B2401",
          expiry: "2027-01-01",
          stock: 40,
          reorderLevel: 10,
          costPrice: 68,
          sellPrice: 76,
        },
      ],
      sales: [
        {
          id: "s1",
          date: "2026-08-01T10:00:00.000Z",
          customer: "রহিম উদ্দিন",
          items: [{ medicineId: "m1", name: "মিনিকেট চাল", qty: 3, unitPrice: 76, unitCost: 68 }],
          total: 228,
          cost: 204,
          saleType: "credit",
          amountPaid: 100,
        },
      ],
      purchases: [
        {
          id: "p1",
          date: "2026-07-20T10:00:00.000Z",
          supplier: "করিম ট্রেডার্স",
          items: [{ medicineId: "m1", name: "মিনিকেট চাল", qty: 50, unitCost: 68 }],
          total: 3400,
        },
      ],
    },
  });

const loadStoreFresh = async () => {
  vi.resetModules();
  return import("@/store/shop");
};

describe("legacy store migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("moves medicines to products and keeps every field", async () => {
    window.localStorage.setItem(LEGACY_KEY, legacyBlob());
    await loadStoreFresh();

    const migrated = JSON.parse(window.localStorage.getItem(STORE_KEY)!);
    expect(migrated.state.products).toHaveLength(1);
    const p = migrated.state.products[0];
    expect(p.id).toBe("m1");
    expect(p.name).toBe("মিনিকেট চাল");
    expect(p.stock).toBe(40);
    expect(p.sellPrice).toBe(76);
    // Pre-rename rows had no unit; they must get the default rather than undefined.
    expect(p.unit).toBe("piece");
  });

  it("rewrites medicineId to productId on sale and purchase lines", async () => {
    window.localStorage.setItem(LEGACY_KEY, legacyBlob());
    await loadStoreFresh();

    const migrated = JSON.parse(window.localStorage.getItem(STORE_KEY)!);
    const saleItem = migrated.state.sales[0].items[0];
    expect(saleItem.productId).toBe("m1");
    expect(saleItem).not.toHaveProperty("medicineId");

    const purchaseItem = migrated.state.purchases[0].items[0];
    expect(purchaseItem.productId).toBe("m1");
    expect(purchaseItem).not.toHaveProperty("medicineId");
  });

  it("preserves outstanding credit so a customer's baki is not lost", async () => {
    window.localStorage.setItem(LEGACY_KEY, legacyBlob());
    await loadStoreFresh();

    const sale = JSON.parse(window.localStorage.getItem(STORE_KEY)!).state.sales[0];
    expect(sale.saleType).toBe("credit");
    expect(sale.total).toBe(228);
    expect(sale.amountPaid).toBe(100);
  });

  it("does not overwrite an already-migrated store", async () => {
    window.localStorage.setItem(LEGACY_KEY, legacyBlob());
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ state: { products: [{ id: "keep-me" }], sales: [], purchases: [] } })
    );
    await loadStoreFresh();

    const after = JSON.parse(window.localStorage.getItem(STORE_KEY)!);
    expect(after.state.products[0].id).toBe("keep-me");
  });

  it("leaves a fresh install alone when there is nothing to migrate", async () => {
    await loadStoreFresh();
    // No legacy blob means no migration write; the store seeds itself instead.
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it("survives a corrupt legacy blob instead of failing to boot", async () => {
    window.localStorage.setItem(LEGACY_KEY, "{not json at all");
    await expect(loadStoreFresh()).resolves.toBeDefined();
  });
});
