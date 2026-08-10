import { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { typography } from "@/lib/typography";
import { useResponsiveCurrency } from "@/lib/format";
import { getPaymentStatus, type Sale } from "@/store/shop";

type Row = {
  key: string;          // yyyy-MM-dd
  date: Date;           // midnight of that day
  transactions: number;
  totalSales: number;
  cashSales: number;    // money collected
  dueSales: number;     // outstanding (unpaid portion)
  isToday: boolean;
};

/**
 * Daily aggregated sales table.
 *
 * - One row per calendar day.
 * - Today's row is always present (auto-generated at 12:00 AM via a
 *   midnight ticker), even when no transactions have been recorded yet.
 * - Totals update live as new sales are recorded for that day.
 */
export function DailySalesTable({ sales }: { sales: Sale[] }) {
  const fmtMoney = useResponsiveCurrency();
  const [today, setToday] = useState<Date>(() => startOfDay(new Date()));

  // Re-tick exactly at the next midnight so a fresh today row appears
  // automatically without needing a page reload.
  useEffect(() => {
    const now = new Date();
    const next = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const ms = next.getTime() - now.getTime();
    const t = setTimeout(() => setToday(startOfDay(new Date())), ms + 50);
    return () => clearTimeout(t);
  }, [today]);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    const ensure = (d: Date): Row => {
      const k = format(d, "yyyy-MM-dd");
      let r = map.get(k);
      if (!r) {
        r = {
          key: k,
          date: startOfDay(d),
          transactions: 0,
          totalSales: 0,
          cashSales: 0,
          dueSales: 0,
          isToday: isSameDay(d, today),
        };
        map.set(k, r);
      }
      return r;
    };

    // Today is always present.
    ensure(today);

    for (const s of sales) {
      const d = new Date(s.date);
      const r = ensure(d);
      r.transactions += 1;
      r.totalSales += s.total;
      const paid =
        s.amountPaid ?? (s.saleType === "credit" ? 0 : s.total);
      r.cashSales += paid;
      r.dueSales += Math.max(0, s.total - paid);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [sales, today]);

  return (
    <Card className="shadow-soft min-w-0">
      <CardContent className="px-0 sm:px-2 pt-3">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Date</TableHead>
                <TableHead className="text-right">Txns</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key} className={r.isToday ? "bg-primary/[0.06]" : undefined}>
                  <TableCell>
                    <div className="flex flex-col leading-tight">
                      <span className={typography("body-strong")}>
                        {format(r.date, "MMM d, yyyy")}
                      </span>
                      <span className={typography("small", "text-muted-foreground")}>
                        {r.isToday ? "Today" : format(r.date, "EEEE")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.transactions}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(r.totalSales)}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtMoney(r.cashSales)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${r.dueSales > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {fmtMoney(r.dueSales)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
