/**
 * Demo-only seeding. Called from loginAsDemo BEFORE the reload so the demo
 * sandbox always starts with the FULL sample dataset — products, cash sales,
 * due (credit) sales, purchases (expenses), customer profiles and dues —
 * regardless of what an older demo session left in localStorage.
 */
import { isDemoMode } from "@/lib/demoMode";
import { upsertProfile } from "@/lib/customerProfiles";
import { DUES_KEY } from "@/lib/customerPayments";
import type { DueEntryLike } from "@/lib/customerPayments";
import { seedProducts, seedSales, seedPurchases } from "@/store/shop";

const DEMO_STORE_KEY = "demo:dokan-store-v1";

const DEMO_CUSTOMERS: {
  name: string;
  phone: string;
  address: string;
  due: number;
}[] = [
  { name: "রহিম উদ্দিন", phone: "01712345678", address: "বাজার রোড, ঢাকা", due: 1250 },
  { name: "আয়েশা সিদ্দিকা", phone: "01823456789", address: "কলেজ গেট, ঢাকা", due: 850 },
  { name: "করিম হোসেন", phone: "01934567890", address: "স্টেশন রোড, নারায়ণগঞ্জ", due: 0 },
  { name: "সুমাইয়া আক্তার", phone: "01645678901", address: "মিরপুর-১০, ঢাকা", due: 540 },
  { name: "তানভীর আহমেদ", phone: "01556789012", address: "ধানমন্ডি, ঢাকা", due: 2300 },
];

export function seedDemoCustomers(): void {
  if (!isDemoMode()) return;

  // 1) Shop store — write the full persisted blob directly (zustand persist
  //    shape: { state, version }). Rehydrate merges it over the store's
  //    defaults (functions come from defaults), so this is a guaranteed
  //    fresh dataset every demo entry.
  try {
    const products = seedProducts();
    localStorage.setItem(
      DEMO_STORE_KEY,
      JSON.stringify({
        state: {
          products,
          sales: seedSales(products),
          purchases: seedPurchases(products),
        },
        version: 0,
      }),
    );
  } catch {
    /* ignore quota */
  }

  // 2) Customer profiles.
  DEMO_CUSTOMERS.forEach((c) =>
    upsertProfile(c.name, { phone: c.phone, address: c.address }),
  );

  // 3) Standalone due entries (বাকি) for customers with outstanding balances.
  const dues: DueEntryLike[] = DEMO_CUSTOMERS.filter((c) => c.due > 0).map((c) => ({
    id: `demo-due-${c.name.replace(/\s+/g, "-")}`,
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    customer: c.name,
    total: c.due,
  }));

  try {
    localStorage.setItem(DUES_KEY, JSON.stringify(dues));
  } catch {
    /* ignore quota */
  }
}
