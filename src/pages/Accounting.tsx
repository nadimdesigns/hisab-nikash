import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";
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

/** Bangla labels for transaction types (English values kept for filtering). */
const TXN_TYPE_LABEL: Record<AllTxnType, string> = {
  "Cash Sale": "নগদ বিক্রি",
  "Due Sale": "বাকি বিক্রি",
  "New Payment": "নতুন পেমেন্ট",
  "Purchase": "ক্রয়",
};

export default function Accounting() {
  const { sales, purchases } = useShop();
  const hydrated = useShopHydrated();

  const [allTypeFilter, setAllTypeFilter] = useState<"all" | AllTxnType>("all");

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
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, purchases]);

  const filteredAllTransactions = useMemo(() => {
    return allTransactionsList.filter((t) => {
      if (allTypeFilter !== "all" && t.type !== allTypeFilter) return false;
      return true;
    });
  }, [allTransactionsList, allTypeFilter]);

  return (
    <AppLayout title="হিসাব">
      <div className="mb-[10px] flex w-full flex-nowrap items-center gap-2">
        <Select value={allTypeFilter} onValueChange={(v) => setAllTypeFilter(v as "all" | AllTxnType)}>
          <SelectTrigger className="h-12 w-full flex-1 gap-2 rounded-md border border-input bg-white px-3 py-2 hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-foreground dark:border-input dark:hover:bg-white/10 dark:hover:text-foreground md:h-10">
            <SelectValue placeholder="সব ধরনের" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরনের</SelectItem>
            <SelectItem value="Cash Sale">নগদ বিক্রি</SelectItem>
            <SelectItem value="Due Sale">বাকি বিক্রি</SelectItem>
            <SelectItem value="New Payment">নতুন পেমেন্ট</SelectItem>
            <SelectItem value="Purchase">ক্রয়</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild className="flex-1 bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-400 text-white shadow-md shadow-emerald-600/25 hover:from-emerald-600 hover:via-emerald-500 hover:to-lime-300">
          <Link to="/new-transaction">
            <Plus className="h-4 w-4" /> নতুন লেনদেন
          </Link>
        </Button>
      </div>


      <Card className="form-surface shadow-soft">
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>রেফারেন্স</TableHead>
                  <TableHead>পরিমাণ</TableHead>
                  <TableHead className="text-right">বিল</TableHead>
                  <TableHead>তারিখ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hydrated ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={`all-sk-${i}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAllTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className={typography("body-muted", "py-8 text-center")}>
                      {allTypeFilter === "New Payment"
                        ? "এখনও কোনো পেমেন্ট রেকর্ড হয়নি।"
                        : "এখনও কোনো লেনদেন নেই।"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAllTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-[220px]">
                        <div className="truncate">{t.reference}</div>
                        <span className={cn(
                          "mt-1 inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
                          t.type === "Cash Sale" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
                          t.type === "Due Sale" && "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
                          t.type === "New Payment" && "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
                          t.type === "Purchase" && "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
                        )}>
                          {TXN_TYPE_LABEL[t.type]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.summary}</TableCell>
                      <TableCell className={cn(
                        "text-right tabular-nums font-medium",
                        t.type === "Purchase" ? "text-destructive" : "text-foreground",
                      )}>
                        {t.type === "Purchase" ? "−" : ""}{currency(t.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(t.date), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className={typography("body-muted")}>
              {allTransactionsList.length}টি লেনদেনের মধ্যে {filteredAllTransactions.length}টি
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
