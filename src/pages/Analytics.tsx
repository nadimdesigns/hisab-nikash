import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Truck, type LucideIcon } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { bnNumber, currency, formatDate } from "@/lib/format";
import { printReport } from "@/lib/printReport";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, startOfDay, subDays } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarIcon, Download, X } from "lucide-react";
import { Search } from "lucide-react";
import { typography } from "@/lib/typography";

type TxnType = "Sale" | "Purchase";
type Txn = {
  type: TxnType;
  date: string;
  reference: string;
  item: string;
  productId: string;
  qty: number;
  unit: number;
  total: number;
  cost: number;
  profit: number;
  net: number;
};

export default function Analytics() {
  const { sales, purchases, products } = useShop();
  const hydrated = useShopHydrated();

  // ---------- Stats period filter ----------
  type StatsPreset = "all" | "today" | "week" | "month" | "year";
  const [statsPreset, setStatsPreset] = useState<StatsPreset>("all");
  const { statsFrom, statsTo } = useMemo(() => {
    const today = new Date();
    switch (statsPreset) {
      case "today":
        return { statsFrom: today, statsTo: today };
      case "week":
        return { statsFrom: subDays(today, 6), statsTo: today };
      case "month":
        return { statsFrom: subDays(today, 29), statsTo: today };
      case "year":
        return { statsFrom: subDays(today, 364), statsTo: today };
      default:
        return { statsFrom: undefined as Date | undefined, statsTo: undefined as Date | undefined };
    }
  }, [statsPreset]);
  const inStatsRange = (iso: string) => {
    if (!statsFrom) return true;
    const ts = new Date(iso).getTime();
    const fromTs = startOfDay(statsFrom).getTime();
    const toTs = statsTo
      ? startOfDay(statsTo).getTime() + 24 * 60 * 60 * 1000 - 1
      : Infinity;
    return ts >= fromTs && ts <= toTs;
  };

  // ---------- Filters ----------
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | TxnType>("all");
  const [itemFilter, setItemFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // ---------- Pagination ----------
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  // ---------- Sorting ----------
  type SortKey = "date" | "type" | "reference" | "total";
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const allTxns = useMemo<Txn[]>(() => {
    const rows: Txn[] = [
      ...sales.flatMap((s) =>
        s.items.map<Txn>((i) => {
          const total = i.qty * i.unitPrice;
          const cost = i.qty * i.unitCost;
          const profit = total - cost;
          return {
            type: "Sale",
            date: s.date,
            reference: s.customer,
            item: i.name,
            productId: i.productId,
            qty: i.qty,
            unit: i.unitPrice,
            total,
            cost,
            profit,
            net: profit,
          };
        }),
      ),
      ...purchases.flatMap((p) =>
        p.items.map<Txn>((i) => {
          const total = i.qty * i.unitCost;
          return {
            type: "Purchase",
            date: p.date,
            reference: p.supplier,
            item: i.name,
            productId: i.productId,
            qty: i.qty,
            unit: i.unitCost,
            total,
            cost: total,
            profit: 0,
            net: -total,
          };
        }),
      ),
    ];
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, purchases]);

  const filteredTxns = useMemo<Txn[]>(() => {
    const fromTs = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const toTs = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;
    const q = search.trim().toLowerCase();
    return allTxns.filter((t) => {
      const ts = new Date(t.date).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (itemFilter !== "all" && t.productId !== itemFilter) return false;
      if (q && !t.reference.toLowerCase().includes(q) && !t.item.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allTxns, fromDate, toDate, typeFilter, itemFilter, search]);

  const filteredTotals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    filteredTxns.forEach((t) => {
      if (t.type === "Sale") revenue += t.total;
      else cost += t.total;
    });
    return { revenue, cost, netProfit: revenue - cost };
  }, [filteredTxns]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, typeFilter, itemFilter, search, pageSize, sortKey, sortDir]);

  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 180);
    return () => clearTimeout(t);
  }, [fromDate, toDate, typeFilter, itemFilter, search, pageSize, sortKey, sortDir, page]);

  const sortedTxns = useMemo<Txn[]>(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const arr = filteredTxns.slice();
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "reference":
          cmp = a.reference.localeCompare(b.reference);
          break;
        case "total":
          cmp = a.total - b.total;
          break;
      }
      return cmp * dir;
    });
    return arr;
  }, [filteredTxns, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTxns.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedTxns = useMemo(
    () => sortedTxns.slice(pageStart, pageEnd),
    [sortedTxns, pageStart, pageEnd],
  );

  const rangeLabel = useMemo(() => {
    if (fromDate && toDate) return `${fromDate} → ${toDate}`;
    if (fromDate) return `From ${fromDate}`;
    if (toDate) return `Until ${toDate}`;
    return "All time";
  }, [fromDate, toDate]);

  const filtersActive = !!fromDate || !!toDate || typeFilter !== "all" || itemFilter !== "all" || !!search.trim();
  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setTypeFilter("all");
    setItemFilter("all");
    setSearch("");
  };

  // ---------- Charts & summaries ----------
  const monthly = useMemo(() => {
    const days = 30;
    const buckets: Record<string, { date: string; revenue: number; cost: number; profit: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const k = formatDate(d, "MMM d");
      buckets[k] = { date: k, revenue: 0, cost: 0, profit: 0 };
    }
    sales.forEach((s) => {
      const d = startOfDay(new Date(s.date));
      const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < days) {
        const k = formatDate(d, "MMM d");
        if (buckets[k]) {
          buckets[k].revenue += s.total;
          buckets[k].cost += s.cost;
          buckets[k].profit += s.total - s.cost;
        }
      }
    });
    return Object.values(buckets);
  }, [sales]);

  const totals = useMemo(() => {
    const salesInRange = sales.filter((x) => inStatsRange(x.date));
    const purchasesInRange = purchases.filter((x) => inStatsRange(x.date));
    const revenue = salesInRange.reduce((s, x) => s + x.total, 0);
    const cogs = salesInRange.reduce((s, x) => s + x.cost, 0);
    const purchasesTotal = purchasesInRange.reduce((s, x) => s + x.total, 0);
    const profit = revenue - cogs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cogs, purchasesTotal, profit, margin };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, purchases, statsFrom?.getTime(), statsTo?.getTime()]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.forEach((s) =>
      s.items.forEach((i) => {
        if (!map[i.productId]) map[i.productId] = { name: i.name, qty: 0, revenue: 0 };
        map[i.productId].qty += i.qty;
        map[i.productId].revenue += i.qty * i.unitPrice;
      }),
    );
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [sales]);

  // ---------- Exports ----------
  const exportCSV = () => {
    const filterParts: string[] = [];
    if (fromDate) filterParts.push(`From ${fromDate}`);
    if (toDate) filterParts.push(`To ${toDate}`);
    if (typeFilter !== "all") filterParts.push(`Type: ${typeFilter}`);
    if (itemFilter !== "all") {
      const m = products.find((x) => x.id === itemFilter);
      filterParts.push(`Item: ${m?.name ?? itemFilter}`);
    }
    if (search.trim()) filterParts.push(`Search: ${search.trim()}`);

    const rows: (string | number)[][] = [
      ["Filtered Totals"],
      ["Range", rangeLabel],
      ["Filters", filterParts.length ? filterParts.join(" | ") : "None"],
      ["Transactions", filteredTxns.length],
      ["Total Revenue", filteredTotals.revenue],
      ["Total Cost", filteredTotals.cost],
      ["Net Profit", filteredTotals.netProfit],
      [],
      ["Type", "Date", "Reference", "Item", "Qty", "Unit", "Total", "Profit", "Net"],
      ...filteredTxns.map((t) => [t.type, t.date, t.reference, t.item, t.qty, t.unit, t.total, t.profit, t.net]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    // BOM so Excel reads the Bengali as UTF-8 rather than the platform codepage.
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HisabNikash-report-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    printReport({
      title: "রিপোর্ট",
      summary: [
        `তৈরি: ${formatDate(new Date(), "dd MMM yyyy, h:mm a")}`,
        `${bnNumber(products.length)} পণ্য · ${bnNumber(sales.length)} বিক্রি · ${bnNumber(purchases.length)} ক্রয়`,
        `${rangeLabel} — ${bnNumber(filteredTxns.length)} লেনদেন`,
        `মোট আয়: ${currency(filteredTotals.revenue)} · মোট খরচ: ${currency(filteredTotals.cost)} · নিট লাভ: ${currency(filteredTotals.netProfit)}`,
      ],
      columns: [
        { header: "ধরন" },
        { header: "তারিখ" },
        { header: "রেফারেন্স" },
        { header: "পণ্য" },
        { header: "পরিমাণ", align: "right" },
        { header: "একক" },
        { header: "মোট", align: "right" },
        { header: "লাভ", align: "right" },
      ],
      rows: filteredTxns.map((t) => [
        t.type,
        t.date,
        t.reference,
        t.item,
        t.qty,
        t.unit,
        t.total,
        t.profit,
      ]),
    });
  };


  return (
    <AppLayout title="Analytics">
      <div className="mb-4 grid grid-cols-3 gap-3 md:gap-4">
        {hydrated ? (
          <>
            <AnalyticsStatCard
              to="/stocks"
              icon={Package}
              iconColor="text-violet-500"
              iconBg="bg-violet-500/10"
              label="SKUs"
              value={String(products.length)}
            />
            <AnalyticsStatCard
              to="/sales"
              icon={ShoppingCart}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              label="Sales"
              value={String(sales.length)}
            />
            <AnalyticsStatCard
              to="/purchases"
              icon={Truck}
              iconColor="text-sky-500"
              iconBg="bg-sky-500/10"
              label="Purchases"
              value={String(purchases.length)}
            />
          </>
        ) : (
          Array.from({ length: 3 }).map((_, i) => <AnalyticsStatCardSkeleton key={i} />)
        )}
      </div>

      <div className="mb-[10px] flex flex-wrap items-center gap-2">
        <Select value={statsPreset} onValueChange={(v) => setStatsPreset(v as typeof statsPreset)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Time" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="today">Today</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-6 shadow-soft">
        <CardHeader>
          <CardTitle>Revenue vs Profit — last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => currency(v)}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-soft">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference or item name..."
              className="pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className={typography("body-muted")}>From date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={typography("body-muted")}>To date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={typography("body-muted")}>Type</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | TxnType)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Sale">Sale</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={typography("body-muted")}>Item</Label>
              <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All items</SelectItem>
                  {products.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={clearFilters}
                disabled={!filtersActive}
                className="gap-2 w-full"
              >
                <X className="h-4 w-4" /> Clear filters
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className={typography("body-muted")}>
              {filteredTxns.length} of {allTxns.length} transactions
            </p>
            <div className="flex items-center gap-3">
              <p className={typography("body-muted")}>
                Revenue {currency(filteredTotals.revenue)} · Cost {currency(filteredTotals.cost)}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={exportCSV}
                disabled={filteredTxns.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>


          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader label="Type" k="type" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead><SortHeader label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead><SortHeader label="Reference" k="reference" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right"><SortHeader label="Total" k="total" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" /></TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-14" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-14" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-14" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTxns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className={typography("body-muted", "py-6 text-center")}>
                      No transactions match the active filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedTxns.map((t, idx) => (
                    <TableRow key={`${t.type}-${t.date}-${t.productId}-${pageStart + idx}`}>
                      <TableCell>{t.type}</TableCell>
                      <TableCell>{t.date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.reference}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.item}</TableCell>
                      <TableCell className="text-right">{t.qty}</TableCell>
                      <TableCell className="text-right">{currency(t.unit)}</TableCell>
                      <TableCell className="text-right">{currency(t.total)}</TableCell>
                      <TableCell className={`text-right ${t.profit > 0 ? "text-success" : t.profit < 0 ? "text-destructive" : ""}`}>
                        {currency(t.profit)}
                      </TableCell>
                      <TableCell className={`text-right ${t.net > 0 ? "text-success" : t.net < 0 ? "text-destructive" : ""}`}>
                        {currency(t.net)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredTxns.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={typography("body-muted")}>Rows per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100, 250].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className={typography("body-muted")}>
                {pageStart + 1}–{Math.min(pageEnd, filteredTxns.length)} of {filteredTxns.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={safePage === 1}>First</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</Button>
                <span className={typography("body-muted", "min-w-[80px] text-center")}>Page {safePage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>Last</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-soft">
        <CardHeader><CardTitle>Top selling products</CardTitle></CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className={typography("body-muted")}>No sales data yet.</p>
          ) : (
            <ul className="space-y-3">
              {topProducts.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={typography("body-strong", "truncate")}>{p.name}</p>
                    <p className={typography("body-muted")}>{p.qty} units sold</p>
                  </div>
                  <span className={typography("body", "font-semibold")}>{currency(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex w-full gap-2">
        <Button
          variant="outline"
          onClick={exportCSV}
          className="flex-1 gap-2 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button
          variant="outline"
          onClick={exportPDF}
          className="flex-1 gap-2 dark:text-white dark:hover:text-white"
        >
          <Download className="h-4 w-4" /> Export PDF
        </Button>
      </div>
    </AppLayout>
  );
}

function AnalyticsStatCardSkeleton() {
  return (
    <Card className="shadow-soft" aria-busy="true" aria-label="Loading">
      <CardContent className="p-3 pl-[22px] md:p-5 md:pl-5 md:pt-3">
        <div className="flex flex-row-reverse items-center gap-2.5 md:flex-row md:gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl md:h-14 md:w-14" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsStatCard({
  to,
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  to: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <Link to={to} aria-label={`Open ${label} (${value})`} className="block">
      <Card className="shadow-soft transition-colors active:bg-muted">
        <CardContent className="p-3 md:p-5 md:pt-3">
          <div className="flex flex-col items-center gap-2 md:flex-row md:gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14 ${iconBg}`}>
              <Icon className={`h-5 w-5 md:h-7 md:w-7 ${iconColor}`} strokeWidth={2} aria-hidden />
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center md:items-start">
              <p aria-hidden="true" className={typography("h4", "truncate")}>{value}</p>
              <p className={typography("stat-label", "truncate")}>{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

type SortKey = "date" | "type" | "reference" | "total";
function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === k;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={`inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors ${
        active ? "text-foreground" : "text-muted-foreground"
      } ${align === "right" ? "ml-auto" : ""}`}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
