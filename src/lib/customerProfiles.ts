import { dataKey } from "@/lib/demoMode";

export type CustomerProfile = {
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export const PROFILES_KEY = dataKey("medishop-customer-profiles-v1");

export const loadProfiles = (): Record<string, CustomerProfile> => {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CustomerProfile>) : {};
  } catch {
    return {};
  }
};

export const saveProfiles = (profiles: Record<string, CustomerProfile>) => {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore quota/privacy errors
  }
};

/** Upsert a single customer profile (keyed by trimmed customer name). */
export const upsertProfile = (name: string, profile: CustomerProfile) => {
  const key = name.trim();
  if (!key) return;
  const all = loadProfiles();
  all[key] = { ...(all[key] ?? {}), ...profile };
  saveProfiles(all);
};
