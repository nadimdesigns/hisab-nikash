import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useShop, useShopHydrated } from "@/store/shop";
import { currency } from "@/lib/format";
import { format } from "date-fns";
import { Plus, Search, X } from "lucide-react";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";

type AllTxnType = "Cash Sale" | "Due Sale" | "New Payment" | "Purchase";
type AllTxn = {
  id: string;
  type: AllTxnType;
  date: string;
  reference: string;
  summary: string;
  amount: number;
};

export default function Accounting() {
  const { sales, purchases } = useShop();
  const hydrated = useShopHydrated();

  const [allTypeFilter, setAllTypeFilter] = useState<"all" | AllTxnType>("all");
  const [allSearch, setAllSearch] = useState("");

  const allTransactionsList = useMemo<AllTxn[]>(() => {
    const rows: AllTxn[] = [];
    sales.forEach((s) => {
      const isCredit = s.saleType === "credit";
      rows.push({
        id: `sale-${s.id}`,
        type: isCredit ? "Due Sale" : "Cash Sale",
        date: s.date,
        reference: s.customer || "—",
        summary: `${s.items.length} item${s.items.length === 1 ? "" : "s"}`,
        amount: s.total,
      });
    });
    purchases.forEach((p) => {
      rows.push({
        id: `purchase-${p.id}`,
        type: "Purchase",
        date: p.date,
        reference: p.supplier || "—",
        summary: `${p.items.length} item${p.items.length === 1 ? "" : "s"}`,
        amount: p.total,
      });
    });
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, purchases]);

  const filteredAllTransactions = useMemo(() => {
    const q = allSearch.trim().toLowerCase();
    return allTransactionsList.filter((t) => {
      if (allTypeFilter !== "all" && t.type !== allTypeFilter) return false;
      if (!q) return true;
      return (
        t.summary.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      );
    });
  }, [allTransactionsList, allTypeFilter, allSearch]);

  return (
    <AppLayout title="Accounting">
      <div className="mb-[10px] flex w-full flex-nowrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={allSearch}
            onChange={(e) => setAllSearch(e.target.value)}
            placeholder="Search..."
            className="pl-9 pr-9"
          />
          {allSearch && (
            <button
              type="button"
              onClick={() => setAllSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={allTypeFilter} onValueChange={(v) => setAllTypeFilter(v as "all" | AllTxnType)}>
          <SelectTrigger className="h-10 w-auto shrink-0 gap-2 rounded-md border border-input bg-white px-3 py-2 hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-foreground dark:border-input dark:hover:bg-white/10 dark:hover:text-foreground">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Cash Sale">Cash Sale</SelectItem>
            <SelectItem value="Due Sale">Due Sale</SelectItem>
            <SelectItem value="New Payment">New Payment</SelectItem>
            <SelectItem value="Purchase">Purchase</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild className="shrink-0">
          <Link to="/new-transaction">
            <Plus className="h-4 w-4" /> New Transaction
          </Link>
        </Button>
      </div>


      <Card className="shadow-soft">
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hydrated ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={`all-sk-${i}`}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAllTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className={typography("body-muted", "py-8 text-center")}>
                      {allTypeFilter === "New Payment"
                        ? "No payments recorded yet."
                        : "No transactions yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAllTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(t.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
                          t.type === "Cash Sale" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
                          t.type === "Due Sale" && "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
                          t.type === "New Payment" && "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
                          t.type === "Purchase" && "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
                        )}>
                          {t.type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{t.reference}</TableCell>
                      <TableCell className="text-muted-foreground">{t.summary}</TableCell>
                      <TableCell className={cn(
                        "text-right tabular-nums font-medium",
                        t.type === "Purchase" ? "text-destructive" : "text-foreground",
                      )}>
                        {t.type === "Purchase" ? "−" : ""}{currency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className={typography("body-muted")}>
              {filteredAllTransactions.length} of {allTransactionsList.length} transactions
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
