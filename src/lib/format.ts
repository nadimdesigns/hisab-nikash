/**
 * Currency formatting helpers.
 *
 * - `currency(n)` — full localized BDT format ("৳ 1,23,45,678.00"). Use this
 *   in tables, invoices, and detail views where exact figures matter.
 * - `currencyCompact(n)` — shortened form using K / L / Cr suffixes (Indian
 *   subcontinent scale, since the app is Bangladesh-focused). Falls through
 *   to the full format below the K threshold so small numbers stay precise.
 * - `useResponsiveCurrency()` — picks the compact formatter on mobile widths
 *   and the full formatter on tablet/desktop, so big totals never truncate.
 */
import { useIsMobile } from "@/hooks/use-mobile";

export const currency = (n: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.ceil(n));

/**
 * Compact currency for tight spaces. Uses Indian-system suffixes
 * (K = thousand, L = lakh = 1e5, Cr = crore = 1e7) which match how
 * BDT amounts are commonly read in Bangladesh.
 */
export const currencyCompact = (n: number): string => {
  const ceiled = n < 0 ? -Math.ceil(Math.abs(n)) : Math.ceil(n);
  const abs = Math.abs(ceiled);
  if (abs < 1_000) return currency(ceiled);
  const sign = ceiled < 0 ? "-" : "";
  const fmt = (v: number, suffix: string) => {
    // Round up to next tenth so compact values never display as a smaller figure.
    const rounded = Math.ceil(v * 10) / 10;
    const str = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
    return `${sign}৳${str}${suffix}`;
  };
  if (abs >= 10_000_000) return fmt(abs / 10_000_000, "Cr");
  if (abs >= 100_000) return fmt(abs / 100_000, "L");
  return fmt(abs / 1_000, "K");
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

export const daysUntil = (iso: string) => {
  const d = new Date(iso).getTime();
  return Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24));
};
