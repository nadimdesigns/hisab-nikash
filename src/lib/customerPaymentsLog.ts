/**
 * Customer payment ledger — every time a customer pays against outstanding
 * dues (full or partial), we append an entry here so the payment shows up
 * as its own transaction in the customer's history.
 *
 * Cash sales and due sales themselves are already recorded via the shop
 * store (`sales`) and the dues bucket (`medishop-dues-v1`); this ledger is
 * strictly for standalone payments (receipts) applied afterwards.
 */
import { dataKey } from "@/lib/demoMode";

export type PaymentEntry = {
  id: string;
  date: string; // ISO
  customer: string;
  /** Total amount received in this receipt. */
  amount: number;
  /**
   * Portion of `amount` that was applied against standalone due entries
   * (which reduce the dues bucket total but do NOT touch any sale's
   * `amountPaid`). Used by stats to avoid double-counting when computing
   * total-paid, since the sales-portion is already reflected in
   * `sale.amountPaid`.
   */
  allocatedToDues?: number;
  note?: string;
};

export const PAYMENTS_KEY = dataKey("medishop-payments-v1");

const uid = () => Math.random().toString(36).slice(2, 10);

export const loadPayments = (): PaymentEntry[] => {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    return raw ? (JSON.parse(raw) as PaymentEntry[]) : [];
  } catch {
    return [];
  }
};

export const savePayments = (entries: PaymentEntry[]) => {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
};

export const appendPayment = (
  entry: Omit<PaymentEntry, "id" | "date"> & { date?: string; id?: string },
): PaymentEntry => {
  const record: PaymentEntry = {
    id: entry.id ?? uid(),
    date: entry.date ?? new Date().toISOString(),
    customer: entry.customer,
    amount: Math.round(entry.amount * 100) / 100,
    allocatedToDues:
      entry.allocatedToDues != null
        ? Math.round(entry.allocatedToDues * 100) / 100
        : undefined,
    note: entry.note,
  };
  const next = [record, ...loadPayments()];
  savePayments(next);
  return record;
};
