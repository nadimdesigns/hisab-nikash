/**
 * Demo-only customer/dues seeding. The shop store seeds products/sales/
 * purchases itself on rehydrate; customer profiles and due entries live in
 * separate localStorage keys, so the demo sandbox seeds them here (called
 * from loginAsDemo BEFORE the reload, so every page sees them on mount).
 */
import { isDemoMode } from "@/lib/demoMode";
import { upsertProfile } from "@/lib/customerProfiles";
import { DUES_KEY } from "@/lib/customerPayments";
import type { DueEntryLike } from "@/lib/customerPayments";

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

  DEMO_CUSTOMERS.forEach((c) =>
    upsertProfile(c.name, { phone: c.phone, address: c.address }),
  );

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
