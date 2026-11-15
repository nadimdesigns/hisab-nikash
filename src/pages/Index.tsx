import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useShop, useShopHydrated } from "@/store/shop";
import { bnNumber, currency, currencyCompact, formatDate } from "@/lib/format";
import { AlertTriangle, TrendingUp, Wallet, LineChart, Package, ShoppingCart, UserPlus, Receipt, Clock, ArrowDownLeft, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { subDays, startOfDay } from "date-fns";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demoMode";
import { unitLabel } from "@/lib/copy";

const Index = () => {
  const { products, sales, purchases } = useShop();
  const hydrated = useShopHydrated();
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");

  const stats = useMemo(() => {
    const inventoryValue = products.reduce((s, m) => s + m.stock * m.costPrice, 0);
    const lowStock = products.filter((m) => m.stock <= m.reorderLevel);
    const today = startOfDay(new Date()).getTime();
    const todaySales = sales.filter((s) => new Date(s.date).getTime() >= today);
    const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);
    const monthSales = sales.filter(
      (s) => new Date(s.date).getTime() >= subDays(new Date(), 30).getTime()
    );
    const monthRevenue = monthSales.reduce((s, x) => s + x.total, 0);
    const monthProfit = monthSales.reduce((s, x) => s + (x.total - x.cost), 0);

    // Period-scoped income/expense/net for the balance card (Hisab-Kitab style).
    const periodStart = subDays(new Date(), period === "today" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365).getTime();
    const periodIncome = sales
      .filter((s) => new Date(s.date).getTime() >= periodStart)
      .reduce((s, x) => s + (x.saleType === "credit" ? (x.amountPaid ?? 0) : x.total), 0);
    const periodExpense = purchases
      .filter((p) => new Date(p.date).getTime() >= periodStart)
      .reduce((s, p) => s + p.total, 0);
    const periodNet = periodIncome - periodExpense;

    // Cash in hand (all-time): everything paid in minus money spent on stock.
    const cashReceived = sales.reduce(
      (s, x) => s + (x.saleType === "credit" ? (x.amountPaid ?? 0) : x.total),
      0
    );
    const cashSpent = purchases.reduce((s, p) => s + p.total, 0);
    const cashBalance = cashReceived - cashSpent;

    // Recent activity: latest sales first.
    const recent = [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Best selling products (last 30 days) by qty sold
    const tally = new Map<string, { name: string; qty: number; revenue: number }>();
    monthSales.forEach((s) => {
      s.items.forEach((it) => {
        const cur = tally.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.unitPrice;
        tally.set(it.productId, cur);
      });
    });
    const bestSelling = Array.from(tally.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { inventoryValue, lowStock, bestSelling, todayRevenue, monthRevenue, monthProfit, cashBalance, periodIncome, periodExpense, periodNet, recent };
  }, [products, sales, purchases, period]);

  const chartData = useMemo(() => {
    const days = 14;
    const buckets: { date: string; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      buckets.push({ date: formatDate(d, "MMM d"), revenue: 0 });
    }
    sales.forEach((s) => {
      const d = startOfDay(new Date(s.date));
      const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      const idx = days - 1 - diff;
      if (idx >= 0 && idx < days) buckets[idx].revenue += s.total;
    });
    return buckets;
  }, [sales]);

  return (
    <AppLayout title="হোম">
      <div className="space-y-4">
        {/* Time period filter pills (Hisab-Kitab style) */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {([
            { k: "today", l: "আজ" },
            { k: "week", l: "এই সপ্তাহ" },
            { k: "month", l: "এই মাস" },
            { k: "year", l: "এই বছর" },
          ] as const).map(({ k, l }) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriod(k)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === k
                  ? "bg-emerald-900 text-white"
                  : "border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-900 hover:from-emerald-200/70 hover:to-emerald-100/70 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5 dark:text-emerald-200"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {hydrated ? (
          <BalanceCard net={stats.periodNet} income={stats.periodIncome} expense={stats.periodExpense} />
        ) : (
          <BalanceCardSkeleton />
        )}

        <div className="grid grid-cols-3 gap-1.5">
          <QuickAction icon={ShoppingCart} label="নতুন বিক্রি" to="/new-sale" tint="emerald" />
          <QuickAction icon={UserPlus} label="নতুন কাস্টমার" to="/customers?new=1" tint="emerald" />
          <QuickAction icon={Receipt} label="খরচ যোগ করুন" to="/accounting?new=1" tint="rose" />
        </div>

        {/* Recent activity (Hisab-Kitab "Recent activity" section) */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold">সাম্প্রতিক লেনদেন</h2>
            <Link to="/customers" className="text-[13px] font-medium text-emerald-600 hover:underline">সব দেখুন</Link>
          </div>
          {!hydrated ? (
            <Skeleton className="h-[76px] w-full rounded-2xl" />
          ) : stats.recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              এখনো কোনো লেনদেন নেই — প্রথম বিক্রি করে শুরু করুন!
            </div>
          ) : (
            <ul className="space-y-2">
              {stats.recent.map((s) => {
                const isDue = s.saleType === "credit";
                const Icon = isDue ? Clock : ArrowDownLeft;
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-[18px]",
                      isDue
                        ? "border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
                        : "border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 dark:bg-white/10",
                        isDue
                          ? "text-rose-600 dark:text-rose-300"
                          : "text-emerald-600 dark:text-emerald-300",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.customer || "নগদ বিক্রি"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(new Date(s.date), "MMM d")} · {s.items.reduce((n, it) => n + it.qty, 0)}টি আইটেম</p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        isDue
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {isDue ? "" : "+"}{currency(s.total)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
          {hydrated ? (
            <>
              <StatCard icon={Wallet} gradient="emerald" label="আজকের বিক্রি" value={currencyCompact(stats.todayRevenue)} />
              <StatCard icon={LineChart} gradient="emerald" label="৩০ দিনের লাভ" value={currencyCompact(stats.monthProfit)} />
              <StatCard icon={Package} gradient="emerald" label="স্টকের মূল্য" value={currencyCompact(stats.inventoryValue)} />
              <StatCard icon={AlertTriangle} gradient="rose" label="কম স্টক" value={bnNumber(stats.lowStock.length)} tone={stats.lowStock.length > 0 ? "warn" : "ok"} />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5">
          <CardHeader>
            <CardTitle>গত ১৪ দিনের বিক্রি</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hydrated ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => currency(v)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-transparent">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base font-bold">
              সবচেয়ে বেশি বিক্রি
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {!hydrated ? (
              <ul className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 shrink-0 rounded-[100px]" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </li>
                ))}
              </ul>
            ) : stats.bestSelling.length === 0 ? (
              <p className={typography("body-muted")}>গত ৩০ দিনে কোনো বিক্রি হয়নি।</p>
            ) : (
              <ul className="space-y-2">
                {stats.bestSelling.map((p, idx) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-4 py-[18px] dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5">
                    <div className={typography("body", "flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 font-semibold text-emerald-600 dark:bg-white/10 dark:text-emerald-300")}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={typography("body-strong", "truncate")}>{p.name}</p>
                      <p className={typography("body-muted")}>{currency(p.revenue)} বিক্রি</p>
                    </div>
                    <Badge variant="secondary" className="bg-white text-emerald-700 dark:bg-white/10 dark:text-emerald-300">{bnNumber(p.qty)} বিক্রি</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.lowStock.length > 0 && (
        <Card className="mt-6 rounded-2xl border-0 bg-transparent">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base font-bold">
              কম স্টকের পণ্য
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ul className="space-y-2">
              {stats.lowStock.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/stocks?focus=${encodeURIComponent(m.id)}&edit=1`}
                    className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 px-4 py-[18px] text-left transition-transform hover:-translate-y-0.5 active:scale-[0.99] sm:px-5 sm:py-[22px] dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
                    aria-label={`${m.name} এর স্টক দেখুন`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 text-rose-600 dark:bg-white/10 dark:text-rose-300">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={typography("body-strong", "block truncate")}>{m.name}</span>
                      <span className={typography("body-muted", "block truncate")}>{m.sku || "—"}</span>
                    </span>
                    <Badge variant="destructive" className="shrink-0 bg-white text-rose-700 hover:bg-white dark:bg-white/10 dark:text-rose-300">
                      {bnNumber(m.stock)} {unitLabel(m.unit)} বাকি
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

/**
 * Credit-card style net-balance card (Bank Asia + Hisab-Kitab inspiration):
 * rich blue gradient, glossy premium 3D finish (sheen overlay + embossed
 * digits), tap to reveal the amount, and a bottom Income / Expense split.
 */
function BalanceCard({ net, income, expense }: { net: number; income: number; expense: number }) {
  // Demo account: show the seeded amounts immediately (never blank/masked).
  const [revealed, setRevealed] = useState(isDemoMode());
  return (
    <button
      type="button"
      onClick={() => setRevealed((v) => !v)}
      aria-label={revealed ? "ব্যালেন্স লুকান" : "ব্যালেন্স দেখুন"}
      className="relative aspect-[16/9] w-full overflow-hidden rounded-[24px] bg-[linear-gradient(140deg,#000d05_0%,#0b5a3d_30%,#059669_52%,#0a5c3c_74%,#000d05_100%)] p-4 text-left text-white transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Glowing wave lines (50% reduced opacity) */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden>
        <path d="M0 150 Q 50 115, 100 150 T 200 150 T 300 150 T 400 150" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" fill="none" />
        <path d="M0 185 Q 50 150, 100 185 T 200 185 T 300 185 T 400 185" stroke="rgba(255,255,255,0.075)" strokeWidth="2" fill="none" />
        <path d="M0 220 Q 50 190, 100 220 T 200 220 T 300 220 T 400 220" stroke="rgba(255,255,255,0.045)" strokeWidth="2" fill="none" />
      </svg>

      {/* Glossy premium sheen (static) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.12) 28%, transparent 45%, transparent 70%, rgba(255,255,255,0.16) 88%, rgba(255,255,255,0.30) 100%)",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" aria-hidden />

      <div className="relative flex items-start justify-between">
        {/* EMV-style chip */}
        <span className="flex h-7 w-10 items-center justify-center rounded-md bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner shadow-amber-900/40">
          <span className="flex flex-col gap-[3px]">
            <span className="h-px w-6 bg-amber-900/50" />
            <span className="h-px w-6 bg-amber-900/50" />
            <span className="h-px w-6 bg-amber-900/50" />
          </span>
        </span>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-sm">Active</span>
      </div>

      <div className="relative mt-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">হিসাব নিকাশ</p>
        <p className="text-[10px] uppercase tracking-wider text-white/70">Net Balance · Tap</p>
      </div>

      <p className="relative mt-1 text-[26px] font-extrabold leading-none tracking-tight tabular-nums [text-shadow:0_1px_0_rgba(255,255,255,0.28),0_2px_2px_rgba(0,0,0,0.35),0_6px_16px_rgba(0,0,0,0.35)]">
        {revealed ? currency(net) : "৳ ••••"}
      </p>

      {/* Income / Expense split — inline horizontal */}
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm ring-1 ring-white/15">
          <p className="flex items-center gap-1 text-[11px] text-white/70">
            <ArrowUpRight className="h-3.5 w-3.5" /> আয়
          </p>
          <p className="text-sm font-bold tabular-nums [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">{revealed ? currency(income) : "৳ ••••"}</p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm ring-1 ring-white/15">
          <p className="flex items-center gap-1 text-[11px] text-white/70">
            <ArrowDownLeft className="h-3.5 w-3.5" /> খরচ
          </p>
          <p className="text-sm font-bold tabular-nums [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">{revealed ? currency(expense) : "৳ ••••"}</p>
        </div>
      </div>
    </button>
  );
}

function BalanceCardSkeleton() {
  return (
    <Skeleton aria-busy="true" aria-label="Loading" className="aspect-[16/9] w-full rounded-[24px]" />
  );
}

const QUICK_TINTS = {
  emerald: { icon: "text-emerald-600 dark:text-emerald-300", bg: "border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5" },
  rose: { icon: "text-rose-600 dark:text-rose-300", bg: "border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5" },
} as const;

function QuickAction({
  icon: Icon,
  label,
  to,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  tint: keyof typeof QUICK_TINTS;
}) {
  const t = QUICK_TINTS[tint];
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-transform active:scale-[0.97] ${t.bg}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[100px] bg-white/60 dark:bg-white/10">
        <Icon className={`h-5 w-5 ${t.icon}`} strokeWidth={2.2} />
      </span>
      <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
    </Link>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5" aria-busy="true" aria-label="Loading">
      <CardContent className="p-3 pl-[22px] md:p-5 md:pl-5 md:pt-3">
        <div className="flex flex-row-reverse items-center gap-2.5 md:flex-row md:gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-[100px] md:h-14 md:w-14" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  gradient,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  gradient: "emerald" | "rose";
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  // Permanent Branding Rule:
  // Revenue / Healthy = emerald tint, Expense / Due / Low Stock = rose tint.
  const STYLE = {
    emerald: { card: "border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5", icon: "text-emerald-600 dark:text-emerald-300" },
    rose: { card: "border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5", icon: "text-rose-600 dark:text-rose-300" },
  } as const;
  const s = STYLE[gradient];

  return (
    <Card className={`rounded-2xl ${s.card}`}>
      <CardContent className="p-3 pl-[22px] md:p-5 md:pl-5 md:pt-3">
        <div className="flex flex-row-reverse items-center gap-2.5 md:flex-row md:gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[100px] bg-white/60 dark:bg-white/10 md:h-14 md:w-14">
            <Icon className={`h-6 w-6 md:h-7 md:w-7 ${s.icon}`} strokeWidth={2} aria-hidden />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className={typography("stat-label", "truncate")}>{label}</p>
            <p aria-hidden="true" className={typography("h4", "mt-1 truncate md:-mt-0")}>{value}</p>
            {sub && <p className={typography("stat-sub", "mt-0.5 truncate")}>{sub}</p>}
          </div>
        </div>
        {tone === "warn" && (
          <span className="sr-only">
            <AlertTriangle aria-hidden /> warning
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default Index;
