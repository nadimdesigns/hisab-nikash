import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_UNIT, type UnitCode } from "@/lib/copy";
import { dataKey, isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  /** Unit this item is sold in — কেজি, লিটার, পিস, হালি … */
  unit: UnitCode;
  /** Lot number. Optional for a grocery: rice from a sack has none. */
  batch: string;
  expiry: string; // ISO date
  stock: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  imageUrl?: string;
  /** Optional product barcode / UPN — supports paste or barcode-scanner input. */
  barcode?: string;
  /** Optional alternate names or brand variants used for fuzzy search. */
  aliases?: string[];
};

export type SaleItem = {
  productId: string;
  name: string;
  /** May be fractional for weight/volume units (2.5 কেজি of rice). */
  qty: number;
  unitPrice: number;
  unitCost: number;
};

export type PaymentStatus = "paid" | "partial" | "unpaid";

export type Sale = {
  id: string;
  date: string; // ISO
  customer: string;
  items: SaleItem[];
  total: number;
  cost: number;
  /** Optional payment type for the sale ("cash" | "credit"). Defaults to cash. */
  saleType?: "cash" | "credit";
  /** Amount the customer has paid so far. Defaults to total for cash, 0 for credit. */
  amountPaid?: number;
};

/** Derive payment status from a sale's total + amountPaid. */
export const getPaymentStatus = (sale: Pick<Sale, "total" | "amountPaid" | "saleType">): PaymentStatus => {
  const paid = sale.amountPaid ?? (sale.saleType === "credit" ? 0 : sale.total);
  if (paid >= sale.total) return "paid";
  if (paid <= 0) return "unpaid";
  return "partial";
};

export type PurchaseItem = {
  productId: string;
  name: string;
  qty: number;
  unitCost: number;
};

export type Purchase = {
  id: string;
  date: string;
  supplier: string;
  supplierCompany?: string;
  supplierPhone?: string;
  items: PurchaseItem[];
  total: number;
};

type ShopState = {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];

  addProduct: (m: Omit<Product, "id">) => void;
  updateProduct: (id: string, m: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restoreProduct: (m: Product, index?: number) => void;

  recordSale: (sale: Omit<Sale, "id" | "date" | "total" | "cost">) => Sale | null;
  updateSale: (id: string, patch: Partial<Pick<Sale, "customer" | "items" | "saleType" | "amountPaid">>) => void;
  deleteSale: (id: string) => void;
  recordPurchase: (
    p: Omit<Purchase, "id" | "date" | "total">
  ) => Purchase;

  resetAll: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Quantities are fractional now (2.5 কেজি), so stock arithmetic accumulates
 * binary-float error: subtract 0.1 ten times from 1 and you land on
 * 0.09999999999999998 rather than 0. Round every derived quantity to three
 * decimals — finer than any unit this app sells in — so stock stays exact.
 */
export const roundQty = (n: number): number => Math.round(n * 1000) / 1000;

export const seedProducts = (): Product[] => {
  const today = new Date();
  const inDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const inMonths = (months: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  return [
    // চাল
    { id: uid(), name: "মিনিকেট চাল", sku: "CHAL-MINI", category: "চাল", unit: "kg", batch: "", expiry: inMonths(8), stock: 250, reorderLevel: 50, costPrice: 68, sellPrice: 76 },
    { id: uid(), name: "আতপ চাল", sku: "CHAL-ATOP", category: "চাল", unit: "kg", batch: "", expiry: inMonths(8), stock: 180, reorderLevel: 40, costPrice: 55, sellPrice: 63 },
    { id: uid(), name: "নাজিরশাইল চাল", sku: "CHAL-NAZIR", category: "চাল", unit: "kg", batch: "", expiry: inMonths(7), stock: 120, reorderLevel: 30, costPrice: 78, sellPrice: 88 },
    // ডাল
    { id: uid(), name: "মসুর ডাল", sku: "DAL-MOSUR", category: "ডাল", unit: "kg", batch: "", expiry: inMonths(10), stock: 90, reorderLevel: 20, costPrice: 105, sellPrice: 120 },
    { id: uid(), name: "মুগ ডাল", sku: "DAL-MUG", category: "ডাল", unit: "kg", batch: "", expiry: inMonths(10), stock: 45, reorderLevel: 15, costPrice: 132, sellPrice: 150 },
    { id: uid(), name: "ছোলা", sku: "DAL-CHOLA", category: "ডাল", unit: "kg", batch: "", expiry: inMonths(9), stock: 60, reorderLevel: 20, costPrice: 85, sellPrice: 98 },
    // তেল
    { id: uid(), name: "সয়াবিন তেল ১ লিটার", sku: "TEL-SOYA-1L", category: "তেল", unit: "litre", batch: "", expiry: inMonths(12), stock: 72, reorderLevel: 24, costPrice: 165, sellPrice: 178 },
    { id: uid(), name: "সরিষার তেল ৫০০ মিলি", sku: "TEL-SHOR-500", category: "তেল", unit: "packet", batch: "", expiry: inMonths(10), stock: 30, reorderLevel: 12, costPrice: 145, sellPrice: 165 },
    { id: uid(), name: "পাম তেল", sku: "TEL-PALM", category: "তেল", unit: "litre", batch: "", expiry: inMonths(8), stock: 40, reorderLevel: 15, costPrice: 138, sellPrice: 152 },
    // চিনি ও লবণ
    { id: uid(), name: "চিনি", sku: "CHINI", category: "চিনি ও লবণ", unit: "kg", batch: "", expiry: inMonths(14), stock: 110, reorderLevel: 25, costPrice: 115, sellPrice: 128 },
    { id: uid(), name: "লবণ ১ কেজি", sku: "LOBON-1KG", category: "চিনি ও লবণ", unit: "packet", batch: "", expiry: inMonths(18), stock: 95, reorderLevel: 30, costPrice: 36, sellPrice: 42 },
    { id: uid(), name: "গুড়", sku: "GUR", category: "চিনি ও লবণ", unit: "kg", batch: "", expiry: inMonths(6), stock: 22, reorderLevel: 10, costPrice: 150, sellPrice: 175 },
    // আটা ও ময়দা
    { id: uid(), name: "আটা", sku: "ATA", category: "আটা ও ময়দা", unit: "kg", batch: "", expiry: inMonths(4), stock: 140, reorderLevel: 30, costPrice: 45, sellPrice: 53 },
    { id: uid(), name: "ময়দা", sku: "MOYDA", category: "আটা ও ময়দা", unit: "kg", batch: "", expiry: inMonths(4), stock: 70, reorderLevel: 20, costPrice: 55, sellPrice: 64 },
    { id: uid(), name: "সুজি", sku: "SUJI", category: "আটা ও ময়দা", unit: "kg", batch: "", expiry: inMonths(5), stock: 25, reorderLevel: 10, costPrice: 70, sellPrice: 82 },
    // মসলা
    { id: uid(), name: "হলুদ গুঁড়া ২০০ গ্রাম", sku: "MOS-HOLUD", category: "মসলা", unit: "packet", batch: "", expiry: inMonths(12), stock: 48, reorderLevel: 15, costPrice: 62, sellPrice: 75 },
    { id: uid(), name: "মরিচ গুঁড়া ২০০ গ্রাম", sku: "MOS-MORICH", category: "মসলা", unit: "packet", batch: "", expiry: inMonths(12), stock: 44, reorderLevel: 15, costPrice: 88, sellPrice: 105 },
    { id: uid(), name: "জিরা গুঁড়া ১০০ গ্রাম", sku: "MOS-JIRA", category: "মসলা", unit: "packet", batch: "", expiry: inMonths(12), stock: 26, reorderLevel: 10, costPrice: 95, sellPrice: 115 },
    { id: uid(), name: "ধনিয়া গুঁড়া ২০০ গ্রাম", sku: "MOS-DHONIA", category: "মসলা", unit: "packet", batch: "", expiry: inMonths(12), stock: 18, reorderLevel: 10, costPrice: 58, sellPrice: 70 },
    // সবজি
    { id: uid(), name: "পেঁয়াজ", sku: "SOB-PEAJ", category: "সবজি", unit: "kg", batch: "", expiry: inDays(21), stock: 85, reorderLevel: 20, costPrice: 55, sellPrice: 68 },
    { id: uid(), name: "রসুন", sku: "SOB-ROSUN", category: "সবজি", unit: "kg", batch: "", expiry: inDays(30), stock: 24, reorderLevel: 10, costPrice: 180, sellPrice: 210 },
    { id: uid(), name: "আদা", sku: "SOB-ADA", category: "সবজি", unit: "kg", batch: "", expiry: inDays(18), stock: 16, reorderLevel: 8, costPrice: 190, sellPrice: 225 },
    // দুগ্ধ ও ডিম — the short-dated items that make expiry tracking matter
    { id: uid(), name: "ডিম", sku: "DIM-HALI", category: "দুগ্ধ ও ডিম", unit: "hali", batch: "", expiry: inDays(12), stock: 40, reorderLevel: 15, costPrice: 42, sellPrice: 50 },
    { id: uid(), name: "তরল দুধ ১ লিটার", sku: "DUDH-1L", category: "দুগ্ধ ও ডিম", unit: "packet", batch: "", expiry: inDays(4), stock: 18, reorderLevel: 12, costPrice: 90, sellPrice: 105 },
    { id: uid(), name: "গুঁড়া দুধ ৫০০ গ্রাম", sku: "DUDH-GURA", category: "দুগ্ধ ও ডিম", unit: "packet", batch: "", expiry: inMonths(9), stock: 20, reorderLevel: 8, costPrice: 420, sellPrice: 480 },
    // পানীয় ও স্ন্যাকস
    { id: uid(), name: "চা পাতা ৪০০ গ্রাম", sku: "CHA-400", category: "পানীয়", unit: "packet", batch: "", expiry: inMonths(11), stock: 32, reorderLevel: 12, costPrice: 195, sellPrice: 225 },
    { id: uid(), name: "বিস্কুট প্যাকেট", sku: "BIS-PKT", category: "বিস্কুট ও স্ন্যাকস", unit: "packet", batch: "", expiry: inDays(45), stock: 60, reorderLevel: 20, costPrice: 25, sellPrice: 32 },
    { id: uid(), name: "সেমাই ২০০ গ্রাম", sku: "SEMAI-200", category: "বিস্কুট ও স্ন্যাকস", unit: "packet", batch: "", expiry: inMonths(6), stock: 28, reorderLevel: 10, costPrice: 45, sellPrice: 55 },
    // প্রসাধন
    { id: uid(), name: "সাবান", sku: "SABAN", category: "প্রসাধন", unit: "piece", batch: "", expiry: inMonths(20), stock: 70, reorderLevel: 20, costPrice: 42, sellPrice: 52 },
    { id: uid(), name: "ডিটারজেন্ট ৫০০ গ্রাম", sku: "DET-500", category: "প্রসাধন", unit: "packet", batch: "", expiry: inMonths(16), stock: 36, reorderLevel: 12, costPrice: 78, sellPrice: 92 },
  ];
};

export const seedSales = (products: Product[]): Sale[] => {
  const sales: Sale[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const count = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < count; j++) {
      const m = products[Math.floor(Math.random() * products.length)];
      // Weight and volume items sell in fractions; countable ones do not.
      const fractional = m.unit === "kg" || m.unit === "litre";
      const qty = fractional
        ? roundQty(0.5 + Math.floor(Math.random() * 8) * 0.5)
        : 1 + Math.floor(Math.random() * 5);
      const customer = ["নগদ কাস্টমার", "রহিম উদ্দিন", "আয়েশা সিদ্দিকা", "করিম হোসেন", "সুমাইয়া আক্তার", "তানভীর আহমেদ"][Math.floor(Math.random() * 6)];
      const total = roundQty(qty * m.sellPrice);
      // ~35% of named-customer sales are credit (বাকি) with partial payment,
      // so the accounting page shows due sales and customers carry dues.
      const isCredit = customer !== "নগদ কাস্টমার" && Math.random() < 0.35;
      sales.push({
        id: uid(),
        date: d.toISOString(),
        customer,
        items: [{ productId: m.id, name: m.name, qty, unitPrice: m.sellPrice, unitCost: m.costPrice }],
        total,
        cost: roundQty(qty * m.costPrice),
        saleType: isCredit ? "credit" : "cash",
        amountPaid: isCredit ? roundQty(total * (0.3 + Math.random() * 0.5)) : total,
      });
    }
  }
  return sales;
};

export const seedPurchases = (products: Product[]): Purchase[] => {
  const purchases: Purchase[] = [];
  const now = new Date();
  const suppliers = ["সোনালী ট্রেডার্স", "ঢাকা কোম্পানি", "রহমান এন্টারপ্রাইজ", "গ্রামীণ সুপার শপ"];
  const phone = () => "01" + String(7000000000 + Math.floor(Math.random() * 900000000));
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (30 - i * 7));
    const m1 = products[Math.floor(Math.random() * products.length)];
    const m2 = products[Math.floor(Math.random() * products.length)];
    const qty = 5 + Math.floor(Math.random() * 20);
    const qty2 = 3 + Math.floor(Math.random() * 10);
    purchases.push({
      id: uid(),
      date: d.toISOString(),
      supplier: suppliers[i],
      supplierCompany: `${suppliers[i]} লিমিটেড`,
      supplierPhone: phone(),
      items: [
        { productId: m1.id, name: m1.name, qty, unitCost: m1.costPrice },
        { productId: m2.id, name: m2.name, qty: qty2, unitCost: m2.costPrice },
      ],
      total: roundQty(qty * m1.costPrice + qty2 * m2.costPrice),
    });
  }
  return purchases;
};

const LEGACY_STORE_KEY = dataKey("medishop-store-v2-bd");
const STORE_KEY = dataKey("dokan-store-v1");

/**
 * Carry a pre-rename install forward.
 *
 * The persisted key changed along with the field names, so without this a
 * shopkeeper who already had stock and sales would open the app to an empty
 * store and the seeder would drop pharmacy data on top. Runs once, before
 * the store below reads localStorage, and is a no-op if the new key already
 * exists or the old one never did.
 */
/**
 * Field names as they exist in a pre-rename blob. These deliberately keep
 * the old `medicine*` spelling — that is what is sitting in the shopkeeper's
 * localStorage, and reading it is the whole point of this migration.
 */
type LegacyItem = { medicineId?: string; productId?: string };
type LegacyState = {
  medicines?: Array<Record<string, unknown>>;
  sales?: Array<{ items?: LegacyItem[] }>;
  purchases?: Array<{ items?: LegacyItem[] }>;
};

const migrateLegacyStore = (): void => {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(STORE_KEY) !== null) return;
    const raw = window.localStorage.getItem(LEGACY_STORE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as { state?: LegacyState; version?: number } | null;
    const legacy = parsed?.state;
    if (!legacy) return;

    const relabel = <T extends { items?: LegacyItem[] }>(rows: T[] | undefined) =>
      (rows ?? []).map((row) => ({
        ...row,
        items: (row.items ?? []).map((it) => {
          const { medicineId, ...rest } = it;
          return { ...rest, productId: it.productId ?? medicineId ?? "" };
        }),
      }));

    const migrated = {
      ...parsed,
      state: {
        // Spread last so a row that somehow already carries `unit` keeps it.
        products: (legacy.medicines ?? []).map((m) => ({ unit: DEFAULT_UNIT, ...m })),
        sales: relabel(legacy.sales),
        purchases: relabel(legacy.purchases),
      },
    };
    window.localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
  } catch {
    // A malformed legacy blob must not stop the app from starting; the
    // seeder below will populate a fresh store instead.
  }
};

migrateLegacyStore();

/**
 * Demo accounts are strictly read-only. Wrap any mutating action with this
 * guard: when demo mode is active, surface a toast and skip the mutation.
 * Returns `true` when the call should be aborted by the caller.
 */
const blockedByDemo = (): boolean => {
  if (!isReadOnly()) return false;
  notifyReadOnlyBlocked();
  return true;
};

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      products: [],
      sales: [],
      purchases: [],

      addProduct: (m) => {
        if (blockedByDemo()) return;
        set((s) => ({ products: [...s.products, { ...m, id: uid() }] }));
      },

      updateProduct: (id, patch) => {
        if (blockedByDemo()) return;
        set((s) => ({
          products: s.products.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },

      deleteProduct: (id) => {
        if (blockedByDemo()) return;
        set((s) => ({ products: s.products.filter((m) => m.id !== id) }));
      },

      restoreProduct: (m, index) => {
        if (blockedByDemo()) return;
        set((s) => {
          if (s.products.some((x) => x.id === m.id)) return s;
          const next = [...s.products];
          const i =
            typeof index === "number" && index >= 0 && index <= next.length
              ? index
              : next.length;
          next.splice(i, 0, m);
          return { products: next };
        });
      },

      recordSale: (sale) => {
        if (blockedByDemo()) return null;
        const items = get().products;
        // Validate stock
        for (const it of sale.items) {
          const m = items.find((x) => x.id === it.productId);
          if (!m || m.stock < it.qty) return null;
        }
        const total = roundQty(sale.items.reduce((s, it) => s + it.qty * it.unitPrice, 0));
        const cost = roundQty(sale.items.reduce((s, it) => s + it.qty * it.unitCost, 0));
        const newSale: Sale = {
          ...sale,
          id: uid(),
          date: new Date().toISOString(),
          total,
          cost,
          amountPaid:
            sale.amountPaid ?? (sale.saleType === "credit" ? 0 : total),
        };
        set((s) => ({
          sales: [newSale, ...s.sales],
          products: s.products.map((m) => {
            const it = sale.items.find((i) => i.productId === m.id);
            return it ? { ...m, stock: roundQty(m.stock - it.qty) } : m;
          }),
        }));
        return newSale;
      },

      updateSale: (id, patch) => {
        if (blockedByDemo()) return;
        set((s) => ({
          sales: s.sales.map((sale) => {
            if (sale.id !== id) return sale;
            const next: Sale = { ...sale, ...patch };
            if (patch.items) {
              next.total = roundQty(patch.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0));
              next.cost = roundQty(patch.items.reduce((sum, it) => sum + it.qty * it.unitCost, 0));
            }
            // Clamp amountPaid to [0, total]
            const paid = next.amountPaid ?? (next.saleType === "credit" ? 0 : next.total);
            next.amountPaid = Math.max(0, Math.min(paid, next.total));
            return next;
          }),
        }));
      },

      deleteSale: (id) => {
        if (blockedByDemo()) return;
        set((s) => ({ sales: s.sales.filter((sale) => sale.id !== id) }));
      },

      recordPurchase: (p) => {
        if (blockedByDemo()) {
          // Caller expects a Purchase; return a synthetic one that is NOT
          // persisted so flows depending on the return value don't crash.
          return {
            ...p,
            id: uid(),
            date: new Date().toISOString(),
            total: roundQty(p.items.reduce((s, it) => s + it.qty * it.unitCost, 0)),
          };
        }
        const total = roundQty(p.items.reduce((s, it) => s + it.qty * it.unitCost, 0));
        const newP: Purchase = {
          ...p,
          id: uid(),
          date: new Date().toISOString(),
          total,
        };
        set((s) => ({
          purchases: [newP, ...s.purchases],
          products: s.products.map((m) => {
            const it = p.items.find((i) => i.productId === m.id);
            return it ? { ...m, stock: roundQty(m.stock + it.qty) } : m;
          }),
        }));
        return newP;
      },

      resetAll: () => {
        if (blockedByDemo()) return;
        const items = seedProducts();
        set({ products: items, sales: seedSales(items), purchases: seedPurchases(items) });
      },
    }),
    {
      name: STORE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state && state.products.length === 0) {
          const items = seedProducts();
          state.products = items;
          state.sales = seedSales(items);
          state.purchases = seedPurchases(items);
        }
      },
    }
  )
);

/**
 * React hook that returns `true` once the persisted shop state has been
 * rehydrated from localStorage. Use to gate UI that depends on real data
 * (e.g. show skeleton loaders until hydration completes).
 */
export function useShopHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useShop.persist.hasHydrated());
  useEffect(() => {
    if (useShop.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useShop.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}

/**
 * Cross-tab synchronization for the persisted shop store.
 *
 * Zustand's `persist` middleware writes to localStorage but does NOT listen
 * for `storage` events, so by default an inventory edit in one tab is
 * invisible to other open tabs until a manual reload. We bridge that here:
 * when another tab updates `STORE_KEY`, parse its new value and rehydrate
 * the data slices (`products`, `sales`, `purchases`) in this tab.
 *
 * Conflict policy is "last write wins" — the storage event always carries
 * the most recent value, so we simply trust it. A short debounce collapses
 * a burst of writes (e.g. a rapid stock adjustment) into one update.
 */
if (typeof window !== "undefined") {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: string | null = null;

  const applyExternalUpdate = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as { state?: Partial<ShopState> } | null;
      const next = parsed?.state;
      if (!next) return;
      const current = useShop.getState();
      // Reference-equality short-circuit: if every slice is the same object
      // identity (e.g. our own write echoed back via some edge case), skip.
      const patch: Partial<ShopState> = {};
      if (next.products && next.products !== current.products) {
        patch.products = next.products;
      }
      if (next.sales && next.sales !== current.sales) {
        patch.sales = next.sales;
      }
      if (next.purchases && next.purchases !== current.purchases) {
        patch.purchases = next.purchases;
      }
      if (Object.keys(patch).length > 0) {
        useShop.setState(patch);
        // Notify UI that an external update just landed (e.g. for toasts).
        window.dispatchEvent(new Event("medishop-store-synced"));
      }
    } catch {
      // Ignore malformed payloads — the writing tab will recover on next save.
    }
  };

  window.addEventListener("storage", (ev) => {
    if (ev.key !== STORE_KEY || ev.newValue === null) return;
    pendingValue = ev.newValue;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const v = pendingValue;
      pendingValue = null;
      if (v !== null) applyExternalUpdate(v);
    }, 120);
  });
}
