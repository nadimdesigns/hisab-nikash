import { create } from "zustand";
import { startOfDay, startOfMonth, startOfYear } from "date-fns";

/**
 * The homepage period pill (সকল হিসাব / আজ / এই মাস / এই বছর).
 *
 * Kept in memory only (no persist): the choice survives moving between pages inside the app,
 * and a fresh start of the app (or a reload) goes back to the default, "এই মাস".
 */
export type HomePeriod = "all" | "today" | "month" | "year";

export const DEFAULT_HOME_PERIOD: HomePeriod = "month";

export const useHomePeriod = create<{
  period: HomePeriod;
  setPeriod: (p: HomePeriod) => void;
}>()((set) => ({
  period: DEFAULT_HOME_PERIOD,
  setPeriod: (period) => set({ period }),
}));

/**
 * Start of the selected period as a timestamp: the current calendar day / month / year,
 * or 0 for "সকল হিসাব" (all time, every sale and purchase).
 */
export function periodStart(period: HomePeriod, now: Date = new Date()): number {
  switch (period) {
    case "all":
      return 0;
    case "today":
      return startOfDay(now).getTime();
    case "month":
      return startOfMonth(now).getTime();
    case "year":
      return startOfYear(now).getTime();
  }
}
