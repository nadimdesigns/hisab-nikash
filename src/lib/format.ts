/**
 * Number, currency, and date formatting for a Bangla-first UI.
 *
 * Everything a shopkeeper reads is rendered in Bengali numerals (০-৯) so the
 * interface does not mix scripts mid-sentence. Values a shopkeeper *types*
 * stay in Latin digits, because `<input type="number">` and the numeric
 * keypad only speak Latin — converting those would break entry.
 *
 * - `currency(n)`       — ৳১,২৩,৪৫,৬৭৮ (taka sign, lakh/crore grouping)
 * - `currencyCompact(n)`— shortens to লাখ / কোটি for tight mobile cells
 * - `useResponsiveCurrency()` — compact on mobile, full elsewhere
 * - `formatDate(d, p)`  — date-fns with the Bengali locale and Bengali digits
 * - `bnNumber(n)`       — a bare number (quantities, counts) in Bengali digits
 */
import { format as dateFnsFormat } from "date-fns";
import { bn } from "date-fns/locale";

import { useIsMobile } from "@/hooks/use-mobile";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Rewrite every ASCII digit in a string as its Bengali counterpart. */
export const toBengaliDigits = (s: string): string =>
  s.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);

/**
 * Grouped decimal in the Bangladeshi convention: Bengali digits and
 * lakh/crore grouping (১,২৩,৪৫,৬৭৮), not Western thousands.
 *
 * Note we ask for `decimal` and prepend ৳ ourselves rather than using
 * `style: "currency"`. CLDR places the taka sign *after* the amount for
 * bn-BD ("১,২৫০৳"), but every Bangladeshi banking and shop app writes it
 * in front, and the compact form below already does.
 */
const bnDecimal = (n: number, maximumFractionDigits = 0): string =>
  new Intl.NumberFormat("bn-BD", {
    style: "decimal",
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(n);

/** A bare number in Bengali digits — stock counts, item quantities. */
export const bnNumber = (n: number, maximumFractionDigits = 2): string =>
  bnDecimal(n, maximumFractionDigits);

export const currency = (n: number) => {
  const ceiled = n < 0 ? -Math.ceil(Math.abs(n)) : Math.ceil(n);
  const sign = ceiled < 0 ? "-" : "";
  return `${sign}৳${bnDecimal(Math.abs(ceiled))}`;
};

/**
 * Compact currency for tight spaces.
 *
 * Only abbreviates at লাখ (1e5) and above. Thousands are left in full:
 * a mudi dokan's day is measured in thousands, "৳৫,০০০" is barely longer
 * than an abbreviation would be, and it reads as an exact figure rather
 * than a rounded one.
 */
export const currencyCompact = (n: number): string => {
  const ceiled = n < 0 ? -Math.ceil(Math.abs(n)) : Math.ceil(n);
  const abs = Math.abs(ceiled);
  if (abs < 100_000) return currency(ceiled);
  const sign = ceiled < 0 ? "-" : "";
  const fmt = (v: number, suffix: string) => {
    // Round up to the next tenth so a compact value never reads lower than
    // the real figure.
    const rounded = Math.ceil(v * 10) / 10;
    return `${sign}৳${bnDecimal(rounded, 1)} ${suffix}`;
  };
  if (abs >= 10_000_000) return fmt(abs / 10_000_000, "কোটি");
  return fmt(abs / 100_000, "লাখ");
};

/**
 * Returns the right currency formatter for the current viewport:
 * compact on mobile (<768px), full elsewhere. Use in components where the
 * value sits inside a narrow container that can break layout when the
 * number gets large.
 */
export const useResponsiveCurrency = (): ((n: number) => string) => {
  const isMobile = useIsMobile();
  return isMobile ? currencyCompact : currency;
};

/**
 * The single date formatter for the app. Call this instead of date-fns
 * `format()` directly — the Bengali locale gives Bengali month and day
 * names but leaves the numerals Latin, so the digit pass afterwards is
 * what stops dates reading as "10 আগস্ট 2026".
 */
export const formatDate = (date: Date | string | number, pattern = "dd MMM yyyy"): string => {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return toBengaliDigits(dateFnsFormat(d, pattern, { locale: bn }));
};

export const daysUntil = (iso: string) => {
  const d = new Date(iso).getTime();
  return Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24));
};
