import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Medicine = {
  id: string;
  name: string;
  sku: string;
  category: string;
  batch: string;
  expiry: string; // ISO date
  stock: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  imageUrl?: string;
  /** Optional product barcode / UPN — supports paste or barcode-scanner input. */
  barcode?: string;
  /** Optional alternate names, brand variants, or active ingredients used for fuzzy search. */
  aliases?: string[];
};

export type SaleItem = {
  medicineId: string;
  name: string;
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
  medicineId: string;
  name: string;
  qty: number;
  unitCost: number;
};

export type Purchase = {
  id: string;
  date: string;
  supplier: string;
  items: PurchaseItem[];
  total: number;
};

type ShopState = {
  medicines: Medicine[];
  sales: Sale[];
  purchases: Purchase[];

  addMedicine: (m: Omit<Medicine, "id">) => void;
  updateMedicine: (id: string, m: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  restoreMedicine: (m: Medicine, index?: number) => void;

  recordSale: (sale: Omit<Sale, "id" | "date" | "total" | "cost">) => Sale | null;
  updateSale: (id: string, patch: Partial<Pick<Sale, "customer" | "items" | "saleType" | "amountPaid">>) => void;
  deleteSale: (id: string) => void;
  recordPurchase: (
    p: Omit<Purchase, "id" | "date" | "total">
  ) => Purchase;

  resetAll: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const seedMedicines = (): Medicine[] => {
  const today = new Date();
  const future = (months: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: uid(), name: "Napa 500mg (Beximco)", sku: "NAPA-500", category: "Pain Relief", batch: "B2401", expiry: future(14), stock: 240, reorderLevel: 50, costPrice: 0.95, sellPrice: 1.4 },
    { id: uid(), name: "Ace 500mg (Square)", sku: "ACE-500", category: "Pain Relief", batch: "B2402", expiry: future(18), stock: 180, reorderLevel: 60, costPrice: 0.9, sellPrice: 1.35 },
    { id: uid(), name: "Seclo 20mg (Square)", sku: "SECLO-20", category: "Gastric", batch: "B2403", expiry: future(12), stock: 160, reorderLevel: 50, costPrice: 3.8, sellPrice: 5.6 },
    { id: uid(), name: "Maxpro 20mg (Renata)", sku: "MAXPRO-20", category: "Gastric", batch: "B2404", expiry: future(10), stock: 140, reorderLevel: 40, costPrice: 6.2, sellPrice: 8.5 },
    { id: uid(), name: "Monas 10mg (Acme)", sku: "MONAS-10", category: "Respiratory", batch: "B2405", expiry: future(16), stock: 90, reorderLevel: 30, costPrice: 7, sellPrice: 9.8 },
    { id: uid(), name: "Fexo 120mg (Square)", sku: "FEXO-120", category: "Allergy", batch: "B2406", expiry: future(20), stock: 110, reorderLevel: 35, costPrice: 5.4, sellPrice: 7.6 },
    { id: uid(), name: "Alatrol 10mg (Square)", sku: "ALAT-10", category: "Allergy", batch: "B2407", expiry: future(8), stock: 95, reorderLevel: 30, costPrice: 1.8, sellPrice: 2.6 },
    { id: uid(), name: "Amodis 400mg (Square)", sku: "AMOD-400", category: "Antibiotic", batch: "B2408", expiry: future(9), stock: 70, reorderLevel: 30, costPrice: 3.2, sellPrice: 4.8 },
    { id: uid(), name: "Azithrocin 500mg (Square)", sku: "AZI-500", category: "Antibiotic", batch: "B2409", expiry: future(7), stock: 35, reorderLevel: 40, costPrice: 8.5, sellPrice: 12 },
    { id: uid(), name: "Cef-3 200mg (Square)", sku: "CEF3-200", category: "Antibiotic", batch: "B2410", expiry: future(11), stock: 45, reorderLevel: 25, costPrice: 9.2, sellPrice: 13.5 },
    { id: uid(), name: "Tufnil 200mg (Square)", sku: "TUFN-200", category: "Pain Relief", batch: "B2411", expiry: future(15), stock: 130, reorderLevel: 40, costPrice: 4.1, sellPrice: 6 },
    { id: uid(), name: "Adovas Syrup 100ml (Square)", sku: "ADO-100", category: "Respiratory", batch: "B2412", expiry: future(10), stock: 60, reorderLevel: 25, costPrice: 110, sellPrice: 165 },
    { id: uid(), name: "Tussca Syrup 100ml (Beximco)", sku: "TUSS-100", category: "Respiratory", batch: "B2413", expiry: future(9), stock: 22, reorderLevel: 25, costPrice: 95, sellPrice: 150 },
    { id: uid(), name: "E-Cap 400 IU (Drug Intl.)", sku: "ECAP-400", category: "Supplement", batch: "B2414", expiry: future(22), stock: 200, reorderLevel: 60, costPrice: 6, sellPrice: 10 },
    { id: uid(), name: "Ceevit 250mg (Square)", sku: "CEEV-250", category: "Supplement", batch: "B2415", expiry: future(18), stock: 150, reorderLevel: 50, costPrice: 4, sellPrice: 7 },
    { id: uid(), name: "Calbo-D (Square)", sku: "CALD-500", category: "Supplement", batch: "B2416", expiry: future(20), stock: 120, reorderLevel: 40, costPrice: 9, sellPrice: 15 },
    { id: uid(), name: "Saline ORS Sachet (SMC)", sku: "ORS-SMC", category: "Hydration", batch: "B2417", expiry: future(24), stock: 320, reorderLevel: 100, costPrice: 4, sellPrice: 7 },
    { id: uid(), name: "Glycomet 500mg (Square)", sku: "GLY-500", category: "Diabetes", batch: "B2418", expiry: future(13), stock: 80, reorderLevel: 30, costPrice: 2.8, sellPrice: 4.2 },
    { id: uid(), name: "Comilit 50/500 (Incepta)", sku: "COMI-500", category: "Diabetes", batch: "B2419", expiry: future(11), stock: 18, reorderLevel: 20, costPrice: 7.2, sellPrice: 9.8 },
    { id: uid(), name: "Maxsulin 30/70 Vial (Incepta)", sku: "MAX-INS", category: "Diabetes", batch: "B2420", expiry: future(6), stock: 14, reorderLevel: 15, costPrice: 480, sellPrice: 680 },
    { id: uid(), name: "Sergel 20mg (Eskayef)", sku: "SERG-20", category: "Gastric", batch: "B2421", expiry: future(12), stock: 200, reorderLevel: 60, costPrice: 4.8, sellPrice: 7 },
    { id: uid(), name: "Pantonix 20mg (Opsonin)", sku: "PANT-20", category: "Gastric", batch: "B2422", expiry: future(10), stock: 75, reorderLevel: 30, costPrice: 5.2, sellPrice: 7.4 },
    { id: uid(), name: "Savlon Antiseptic 250ml (ACI)", sku: "SAV-250", category: "Antiseptic", batch: "B2423", expiry: future(28), stock: 55, reorderLevel: 20, costPrice: 180, sellPrice: 260 },
    { id: uid(), name: "Hexisol Hand Rub 250ml (ACI)", sku: "HEX-250", category: "Antiseptic", batch: "B2424", expiry: future(20), stock: 40, reorderLevel: 15, costPrice: 150, sellPrice: 220 },
    { id: uid(), name: "Hand Sanitizer 100ml (Square)", sku: "HSAN-100", category: "Antiseptic", batch: "B2425", expiry: future(24), stock: 90, reorderLevel: 30, costPrice: 60, sellPrice: 95 },
  ];
};

const seedSales = (medicines: Medicine[]): Sale[] => {
  const sales: Sale[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const count = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < count; j++) {
      const m = medicines[Math.floor(Math.random() * medicines.length)];
      const qty = 1 + Math.floor(Math.random() * 5);
      sales.push({
        id: uid(),
        date: d.toISOString(),
        customer: ["Walk-in", "Rahim Uddin", "Ayesha Siddika", "Karim Hossain", "Sumaiya Akter", "Tanvir Ahmed"][Math.floor(Math.random() * 6)],
        items: [{ medicineId: m.id, name: m.name, qty, unitPrice: m.sellPrice, unitCost: m.costPrice }],
        total: qty * m.sellPrice,
        cost: qty * m.costPrice,
      });
    }
  }
  return sales;
};

import { dataKey, isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";

const STORE_KEY = dataKey("medishop-store-v2-bd");

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
      medicines: [],
      sales: [],
      purchases: [],

      addMedicine: (m) => {
        if (blockedByDemo()) return;
        set((s) => ({ medicines: [...s.medicines, { ...m, id: uid() }] }));
      },

      updateMedicine: (id, patch) => {
        if (blockedByDemo()) return;
        set((s) => ({
          medicines: s.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },

      deleteMedicine: (id) => {
        if (blockedByDemo()) return;
        set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) }));
      },

      restoreMedicine: (m, index) => {
        if (blockedByDemo()) return;
        set((s) => {
          if (s.medicines.some((x) => x.id === m.id)) return s;
          const next = [...s.medicines];
          const i =
            typeof index === "number" && index >= 0 && index <= next.length
              ? index
              : next.length;
          next.splice(i, 0, m);
          return { medicines: next };
        });
      },

      recordSale: (sale) => {
        if (blockedByDemo()) return null;
        const meds = get().medicines;
        // Validate stock
        for (const it of sale.items) {
          const m = meds.find((x) => x.id === it.medicineId);
          if (!m || m.stock < it.qty) return null;
        }
        const total = sale.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
        const cost = sale.items.reduce((s, it) => s + it.qty * it.unitCost, 0);
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
          medicines: s.medicines.map((m) => {
            const it = sale.items.find((i) => i.medicineId === m.id);
            return it ? { ...m, stock: m.stock - it.qty } : m;
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
              next.total = patch.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
              next.cost = patch.items.reduce((sum, it) => sum + it.qty * it.unitCost, 0);
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
            total: p.items.reduce((s, it) => s + it.qty * it.unitCost, 0),
          };
        }
        const total = p.items.reduce((s, it) => s + it.qty * it.unitCost, 0);
        const newP: Purchase = {
          ...p,
          id: uid(),
          date: new Date().toISOString(),
          total,
        };
        set((s) => ({
          purchases: [newP, ...s.purchases],
          medicines: s.medicines.map((m) => {
            const it = p.items.find((i) => i.medicineId === m.id);
            return it ? { ...m, stock: m.stock + it.qty } : m;
          }),
        }));
        return newP;
      },

      resetAll: () => {
        if (blockedByDemo()) return;
        const meds = seedMedicines();
        set({ medicines: meds, sales: seedSales(meds), purchases: [] });
      },
    }),
    {
      name: STORE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state && state.medicines.length === 0) {
          const meds = seedMedicines();
          state.medicines = meds;
          state.sales = seedSales(meds);
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
 * the data slices (`medicines`, `sales`, `purchases`) in this tab.
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
      if (next.medicines && next.medicines !== current.medicines) {
        patch.medicines = next.medicines;
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

