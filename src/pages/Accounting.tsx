import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import NewTransactionDialog from "@/components/accounting/NewTransactionDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useShop, useShopHydrated } from "@/store/shop";
import { loadPayments } from "@/lib/customerPaymentsLog";
import { currency } from "@/lib/format";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Clock, Plus, Wallet } from "lucide-react";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";

type AllTxnType = "Cash Sale" | "Due Sale" | "New Payment" | "Purchase" | "Expense";
type AllTxn = {
  id: string;
  type: AllTxnType;
  date: string;
  reference: string;
  summary: string;
  amount: number;
};

/** Bangla labels for transaction types (English values kept for filtering). */
const TXN_TYPE_LABEL: Record<AllTxnType, string> = {
  "Cash Sale": "নগদ বিক্রি",
  "Due Sale": "বাকি বিক্রি",
  "New Payment": "নগদ পেমেন্ট",
  "Purchase": "ক্রয়",
  "Expense": "খরচ",
};

/** খরচ filter shows the same rows as ক্রয় (purchases are the expense records). */
const EXPENSE_ALIASES: AllTxnType[] = ["Purchase", "Expense"];

export default function Accounting() {
  const { sales, purchases } = useShop();
  const hydrated = useShopHydrated();

  const [allTypeFilter, setAllTypeFilter] = useState<"all" | AllTxnType>("all");
  const [txnOpen, setTxnOpen] = useState(false);

  // Auto-open the transaction dialog when arriving via ?new=1 (homepage quick action).
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") setTxnOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allTransactionsList = useMemo<AllTxn[]>(() => {
    const rows: AllTxn[] = [];
    sales.forEach((s) => {
      const isCredit = s.saleType === "credit";
      rows.push({
        id: `sale-${s.id}`,
        type: isCredit ? "Due Sale" : "Cash Sale",
        date: s.date,
        reference: s.customer || "—",
        summary: `${s.items.length}টি আইটেম`,
        amount: s.total,
      });
    });
    purchases.forEach((p) => {
      rows.push({
        id: `purchase-${p.id}`,
        type: "Purchase",
        date: p.date,
        reference: p.supplier || "—",
        summary: `${p.items.length}টি আইটেম`,
        amount: p.total,
      });
    });
    // Standalone cash payments (receipts against dues) — full history view.
    loadPayments().forEach((pay) => {
      rows.push({
        id: `payment-${pay.id}`,
        type: "New Payment",
        date: pay.date,
        reference: pay.customer || "—",
        summary: pay.note ? `পেমেন্ট · ${pay.note}` : "নগদ পেমেন্ট",
        amount: pay.amount,
      });
    });
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, purchases]);

  const filteredAllTransactions = useMemo(() => {
    return allTransactionsList.filter((t) => {
      if (allTypeFilter === "all") return true;
      // খরচ and ক্রয় filters both surface the purchase (expense) rows.
      if (allTypeFilter === "Expense") return EXPENSE_ALIASES.includes(t.type);
      return t.type === allTypeFilter;
    });
  }, [allTransactionsList, allTypeFilter]);

  return (
    <AppLayout title="হিসাব">
      <div className="mb-3 flex w-full flex-nowrap items-center gap-2">
        <Select value={allTypeFilter} onValueChange={(v) => setAllTypeFilter(v as "all" | AllTxnType)}>
          <SelectTrigger className="h-12 w-full flex-1 gap-2 rounded-xl border border-input bg-white px-3 py-2 hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-foreground dark:border-input dark:hover:bg-white/10 dark:hover:text-foreground md:h-10">
            <SelectValue placeholder="সব ধরনের" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরনের</SelectItem>
            <SelectItem value="Purchase">ক্রয়</SelectItem>
            <SelectItem value="Expense">খরচ</SelectItem>
            <SelectItem value="Cash Sale">নগদ বিক্রি</SelectItem>
            <SelectItem value="Due Sale">বাকি বিক্রি</SelectItem>
            <SelectItem value="New Payment">নগদ পেমেন্ট</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => setTxnOpen(true)}
          className="h-12 flex-1 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 md:h-10"
        >
          <Plus className="h-4 w-4" /> নতুন লেনদেন
        </Button>
      </div>

      <NewTransactionDialog open={txnOpen} onOpenChange={setTxnOpen} />

      <div className="space-y-2">
        {!hydrated ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={`all-sk-${i}`}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-3 dark:from-emerald-500/15 dark:to-emerald-500/5"
              >
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl bg-white/80" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </li>
            ))}
          </ul>
        ) : filteredAllTransactions.length === 0 ? (
          <div
            className={typography(
              "body-muted",
              "rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 py-10 text-center dark:from-emerald-500/15 dark:to-emerald-500/5",
            )}
          >
            {allTypeFilter === "New Payment"
              ? "এখনও কোনো পেমেন্ট রেকর্ড হয়নি।"
              : "এখনও কোনো লেনদেন নেই।"}
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredAllTransactions.map((t) => {
              // Permanent branding rule:
              // Revenue (Cash Sale, New Payment/Joma) = Tint Green
              // Expense & Due (Due Sale, Purchase, Expense) = Tint Red
              const isRevenue = t.type === "Cash Sale" || t.type === "New Payment";
              const isOutflow = t.type === "Purchase" || t.type === "Expense";
              const Icon =
                t.type === "Cash Sale"
                  ? ArrowDownLeft
                  : t.type === "New Payment"
                    ? Wallet
                    : t.type === "Due Sale"
                      ? Clock
                      : ArrowUpRight;

              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-0 p-3 sm:p-4",
                    isRevenue
                      ? "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5"
                      : "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/15 dark:to-rose-500/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-white/10",
                      isRevenue
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-rose-600 dark:text-rose-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {t.reference}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-bold tabular-nums",
                          isRevenue
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {isRevenue ? "+" : isOutflow ? "−" : ""}
                        {currency(t.amount)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "inline-flex items-center whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10",
                            isRevenue
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300",
                          )}
                        >
                          {TXN_TYPE_LABEL[t.type]}
                        </span>
                        <span className="truncate">
                          {t.summary} · {format(new Date(t.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between px-1 pt-2">
          <p className={typography("body-muted")}>
            {allTransactionsList.length}টি লেনদেনের মধ্যে {filteredAllTransactions.length}টি
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

