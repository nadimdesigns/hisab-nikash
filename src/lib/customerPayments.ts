/**
 * Customer payment application — FIFO across BOTH partially-paid sales
 * (via the zustand shop store's `sales[i].amountPaid`) and standalone
 * due entries in localStorage (DueSale flow).
 *
 * The two "outstanding" buckets are merged and consumed oldest-first so
 * that a payment reliably reduces total outstanding regardless of which
 * bucket the debt lives in.
 */
import type { Sale } from "@/store/shop";
import { dataKey } from "@/lib/demoMode";
import { appendPayment } from "@/lib/customerPaymentsLog";

export type DueEntryLike = {
  id: string;
  date: string;
  customer: string;
  total: number;
};

export const DUES_KEY = dataKey("medishop-dues-v1");

const round2 = (n: number) => Math.round(n * 100) / 100;

const outstandingOfSale = (s: Sale): number => {
  const paid = s.amountPaid ?? ((s.saleType ?? "cash") === "credit" ? 0 : s.total);
  const clamped = Math.max(0, Math.min(paid, s.total));
  return round2(s.total - clamped);
};

export type ApplyPaymentDeps<D extends DueEntryLike> = {
  sales: Sale[];
  dues: D[];
  updateSale: (id: string, patch: Partial<Pick<Sale, "amountPaid">>) => void;
  setDues: (next: D[]) => void;
};

/**
 * Apply a payment against a customer's total outstanding balance.
 *
 * FIFO by date across:
 *   1. Sales with amountPaid < total  -> bump amountPaid via updateSale
 *   2. Standalone due entries         -> reduce total (or drop)
 *
 * Returns the amount actually applied (may be < amount when the customer
 * owes less than the payment; callers should validate upstream).
 */
export function applyCustomerPayment<D extends DueEntryLike>(
  customerName: string,
  amount: number,
  { sales, dues, updateSale, setDues }: ApplyPaymentDeps<D>,
): number {
  const target = customerName || "Walk-in";
  let remaining = round2(amount);
  if (remaining <= 0) return 0;

  type Bucket =
    | { kind: "sale"; date: string; id: string; outstanding: number; currentPaid: number; total: number }
    | { kind: "due"; date: string; id: string; outstanding: number };

  const buckets: Bucket[] = [];

  sales.forEach((s) => {
    if ((s.customer || "Walk-in") !== target) return;
    const out = outstandingOfSale(s);
    if (out <= 0) return;
    const paid = s.amountPaid ?? ((s.saleType ?? "cash") === "credit" ? 0 : s.total);
    buckets.push({
      kind: "sale",
      date: s.date,
      id: s.id,
      outstanding: out,
      currentPaid: Math.max(0, Math.min(paid, s.total)),
      total: s.total,
    });
  });
  dues.forEach((d) => {
    if ((d.customer || "Walk-in") !== target) return;
    if (d.total <= 0) return;
    buckets.push({ kind: "due", date: d.date, id: d.id, outstanding: d.total });
  });

  // Oldest first
  buckets.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const duePatches = new Map<string, number>(); // id -> new total (0 means drop)
  let allocatedToDues = 0;

  for (const b of buckets) {
    if (remaining <= 0) break;
    const take = Math.min(b.outstanding, remaining);
    if (b.kind === "sale") {
      updateSale(b.id, { amountPaid: round2(b.currentPaid + take) });
    } else {
      duePatches.set(b.id, round2(b.outstanding - take));
      allocatedToDues = round2(allocatedToDues + take);
    }
    remaining = round2(remaining - take);
  }

  if (duePatches.size > 0) {
    const nextDues = dues
      .map((d) => (duePatches.has(d.id) ? { ...d, total: duePatches.get(d.id)! } : d))
      .filter((d) => d.total > 0);
    setDues(nextDues);
    try {
      localStorage.setItem(DUES_KEY, JSON.stringify(nextDues));
    } catch {
      // ignore
    }
  }

  const applied = round2(amount - remaining);
  if (applied > 0) {
    appendPayment({ customer: target, amount: applied, allocatedToDues });
  }
  return applied;
}
