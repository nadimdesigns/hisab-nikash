import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShop, useShopHydrated } from "@/store/shop";
import { currency } from "@/lib/format";
import { format } from "date-fns";
import { typography } from "@/lib/typography";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

type ExpenseType = "all" | "purchase";

type ExpenseRow = {
  id: string;
  date: string;
  type: "purchase";
  typeLabel: string;
  party: string;
  detail: string;
  amount: number;
};

export default function Expenses() {
  const { purchases } = useShop();
  const hydrated = useShopHydrated();
  const navigate = useNavigate();
  const [type, setType] = useState<ExpenseType>("all");
  const [q, setQ] = useState("");

  const rows: ExpenseRow[] = useMemo(() => {
    const all: ExpenseRow[] = purchases.map((p) => ({
      id: p.id,
      date: p.date,
      type: "purchase",
      typeLabel: "Purchase",
      party: p.supplier,
      detail: `${p.items.length} item${p.items.length > 1 ? "s" : ""}`,
      amount: p.total,
    }));
    return all.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [purchases]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (!query) return true;
      return (
        r.party.toLowerCase().includes(query) ||
        r.typeLabel.toLowerCase().includes(query)
      );
    });
  }, [rows, type, q]);

  const total = useMemo(
    () => filtered.reduce((s, r) => s + r.amount, 0),
    [filtered],
  );

  return (
    <AppLayout title="Expenses">
      <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
        <Card className="shadow-soft min-w-0 max-w-full overflow-hidden">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className={typography("h4", "m-0")}>All expenses</CardTitle>
              <Button size="sm" onClick={() => navigate("/purchases?action=new")}>
                <Plus className="mr-1 h-4 w-4" /> New purchase
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
              <Select value={type} onValueChange={(v) => setType(v as ExpenseType)}>
                <SelectTrigger className="bg-[#f7f7f7] dark:bg-white/5">
                  <SelectValue placeholder="Transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search by supplier or type…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-[#f7f7f7] dark:bg-white/5"
              />
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!hydrated ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className={typography("body-muted", "py-8 text-center")}>
                        No expense transactions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(r.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{r.typeLabel}</TableCell>
                        <TableCell className="font-medium">{r.party}</TableCell>
                        <TableCell className={typography("body-muted")}>{r.detail}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {currency(r.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-[15px]">
              <p className={typography("body-muted")}>
                Total ({filtered.length} transaction{filtered.length === 1 ? "" : "s"})
              </p>
              <p className={typography("h3")}>{currency(total)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
