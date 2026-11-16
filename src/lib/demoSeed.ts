/**
 * Demo seeding and storage sync.
 * Writes to the primary live storage so all changes made in demo mode
 * immediately update the live preview and persist across sessions.
 */
import { isDemoMode } from "@/lib/demoMode";
import { PROFILES_KEY, upsertProfile } from "@/lib/customerProfiles";
import { DUES_KEY } from "@/lib/customerPayments";
import { PAYMENTS_KEY } from "@/lib/customerPaymentsLog";
import type { DueEntryLike } from "@/lib/customerPayments";
import { seedProducts, seedSales, seedPurchases } from "@/store/shop";

const LIVE_STORE_KEY = "dokan-store-v1";
const LEGACY_DEMO_STORE_KEY = "demo:dokan-store-v1";

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

  // 1) Shop store — carry over any existing demo sandbox edits if live store is missing,
  //    or seed the full sample dataset if live store is completely uninitialized.
  //    Never overwrite an existing live store with user edits.
  try {
    const legacyDemo = localStorage.getItem(LEGACY_DEMO_STORE_KEY);
    const liveStore = localStorage.getItem(LIVE_STORE_KEY);

    if (!liveStore && legacyDemo) {
      localStorage.setItem(LIVE_STORE_KEY, legacyDemo);
    } else if (!liveStore) {
      const products = seedProducts();
      localStorage.setItem(
        LIVE_STORE_KEY,
        JSON.stringify({
          state: {
            products,
            sales: seedSales(products),
            purchases: seedPurchases(products),
          },
          version: 0,
        }),
      );
    }
  } catch {
    /* ignore quota */
  }

  // 2) Customer profiles — carry over sandbox profiles or seed default ones if none exist.
  try {
    const legacyProfiles = localStorage.getItem("demo:medishop-customer-profiles-v1");
    const liveProfiles = localStorage.getItem(PROFILES_KEY);

    if (!liveProfiles && legacyProfiles) {
      localStorage.setItem(PROFILES_KEY, legacyProfiles);
    } else if (!liveProfiles || liveProfiles === "{}") {
      DEMO_CUSTOMERS.forEach((c) =>
        upsertProfile(c.name, { phone: c.phone, address: c.address }),
      );
    }
  } catch {
    /* ignore quota */
  }

  // 3) Standalone due entries (বাকি) — carry over sandbox dues or seed defaults if empty.
  try {
    const legacyDues = localStorage.getItem("demo:medishop-dues-v1");
    const liveDues = localStorage.getItem(DUES_KEY);

    if (!liveDues && legacyDues) {
      localStorage.setItem(DUES_KEY, legacyDues);
    } else if (!liveDues || liveDues === "[]") {
      const dues: DueEntryLike[] = DEMO_CUSTOMERS.filter((c) => c.due > 0).map((c) => ({
        id: `demo-due-${c.name.replace(/\s+/g, "-")}`,
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        customer: c.name,
        total: c.due,
      }));
      localStorage.setItem(DUES_KEY, JSON.stringify(dues));
    }
  } catch {
    /* ignore quota */
  }

  // 4) Customer payments log — carry over any sandbox payments.
  try {
    const legacyPayments = localStorage.getItem("demo:medishop-payments-v1");
    const livePayments = localStorage.getItem(PAYMENTS_KEY);

    if (!livePayments && legacyPayments) {
      localStorage.setItem(PAYMENTS_KEY, legacyPayments);
    }
  } catch {
    /* ignore quota */
  }
}
