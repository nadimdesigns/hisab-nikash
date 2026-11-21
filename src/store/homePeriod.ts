import { create } from "zustand";
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";

/**
 * The homepage period pill (আজ / এই সপ্তাহ / এই মাস / এই বছর).
 *
 * Kept in memory only (no persist): the choice survives moving between pages inside the app,
 * and a fresh start of the app (or a reload) goes back to the default, "এই মাস".
 */
export type HomePeriod = "today" | "week" | "month" | "year";

export const DEFAULT_HOME_PERIOD: HomePeriod = "month";

export const useHomePeriod = create<{
  period: HomePeriod;
  setPeriod: (p: HomePeriod) => void;
}>()((set) => ({
  period: DEFAULT_HOME_PERIOD,
  setPeriod: (period) => set({ period }),
}));

/** Start of the selected period as a timestamp: the current calendar day / week / month / year. */
export function periodStart(period: HomePeriod, now: Date = new Date()): number {
  switch (period) {
    case "today":
      return startOfDay(now).getTime();
    case "week":
      return startOfWeek(now, { weekStartsOn: 6 }).getTime(); // Saturday, the usual week start in Bangladesh
    case "month":
      return startOfMonth(now).getTime();
    case "year":
      return startOfYear(now).getTime();
  }
}
