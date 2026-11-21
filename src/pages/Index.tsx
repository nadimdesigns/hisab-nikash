import { lazy, Suspense, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useShop, useShopHydrated } from "@/store/shop";
import { bnNumber, currency, currencyCompact, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { subDays, startOfDay } from "date-fns";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { unitLabel } from "@/lib/copy";
import { BalanceCard } from "@/components/BalanceCard";

const SalesChart = lazy(() => import("@/components/SalesChart"));

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
          ] as const).map(({ k, l }, idx) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriod(k)}
              style={{ animationDelay: `${idx * 40}ms` }}
              className={cn(
                "home-card-appear shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === k
                  ? "bg-brand-900 text-white"
                  : "border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 text-brand-900 hover:from-brand-200/70 hover:to-brand-100/70 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5 dark:text-brand-200"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Hero Section: Credit Card on Left + Quick Actions on Right (on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-5 items-stretch">
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            {hydrated ? (
              <BalanceCard net={stats.periodNet} income={stats.periodIncome} expense={stats.periodExpense} />
            ) : (
              <BalanceCardSkeleton />
            )}
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4 h-full">
              <QuickAction emoji="🛒" label="নতুন বিক্রি" to="/new-sale" tint="brand" delay={100} />
              <QuickAction emoji="👤" label="নতুন কাস্টমার" to="/customers?new=1" tint="brand" delay={150} />
              <QuickAction emoji="🧾" label="খরচ যোগ করুন" to="/accounting?new=1" tint="rose" delay={200} />
              <QuickAction emoji="⏳" label="বাকি বিক্রি" to="/new-sale?mode=credit" tint="rose" delay={250} />
              <QuickAction emoji="💰" label="টাকা জমা" to="/accounting?tab=payment" tint="brand" delay={300} />
              <QuickAction emoji="📦" label="পণ্য যোগ" to="/stocks?new=1" tint="brand" delay={350} />
            </div>
          </div>
        </div>

        {/* Recent activity (Hisab-Kitab "Recent activity" section) */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold">সাম্প্রতিক লেনদেন</h2>
            <Link to="/customers" className="text-[13px] font-medium text-brand-600 hover:underline">সব দেখুন</Link>
          </div>
          {!hydrated ? (
            <Skeleton className="h-[76px] w-full rounded-2xl" />
          ) : stats.recent.length === 0 ? (
            <div className="home-card-appear rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              এখনো কোনো লেনদেন নেই — প্রথম বিক্রি করে শুরু করুন!
            </div>
          ) : (
            <ul className="space-y-2">
              {stats.recent.map((s, idx) => {
                const isDue = s.saleType === "credit";
                const emoji = isDue ? "⏳" : "💵";
                return (
                  <li
                    key={s.id}
                    style={{ animationDelay: `${260 + idx * 55}ms` }}
                    className={cn(
                      "home-card-appear group flex items-center gap-3 rounded-2xl border px-4 py-[18px] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                      isDue
                        ? "border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
                        : "border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 text-xl leading-none select-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95 dark:bg-white/10"
                    >
                      {emoji}
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
                          : "text-brand-600 dark:text-brand-400",
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

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 lg:grid-cols-4">
          {hydrated ? (
            <>
              <StatCard emoji="💵" gradient="brand" label="আজকের বিক্রি" value={currencyCompact(stats.todayRevenue)} delay={340} />
              <StatCard emoji="📈" gradient="brand" label="৩০ দিনের লাভ" value={currencyCompact(stats.monthProfit)} delay={400} />
              <StatCard emoji="📦" gradient="brand" label="স্টকের মূল্য" value={currencyCompact(stats.inventoryValue)} delay={460} />
              <StatCard emoji="⚠️" gradient="rose" label="কম স্টক" value={bnNumber(stats.lowStock.length)} tone={stats.lowStock.length > 0 ? "warn" : "ok"} delay={520} />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          style={{ animationDelay: "440ms" }}
          className="home-card-appear lg:col-span-2 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 transition-transform duration-200 hover:-translate-y-0.5 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5"
        >
          <CardHeader>
            <CardTitle>গত ১৪ দিনের বিক্রি</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hydrated ? (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <SalesChart data={chartData} />
              </Suspense>
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
                  <li
                    key={p.id}
                    style={{ animationDelay: `${480 + idx * 55}ms` }}
                    className="home-card-appear group flex items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 px-4 py-[18px] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5"
                  >
                    <div className={typography("body", "flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 font-semibold text-brand-600 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 dark:bg-white/10 dark:text-brand-300")}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={typography("body-strong", "truncate")}>{p.name}</p>
                      <p className={typography("body-muted")}>{currency(p.revenue)} বিক্রি</p>
                    </div>
                    <Badge variant="secondary" className="bg-white text-brand-700 dark:bg-white/10 dark:text-brand-300">{bnNumber(p.qty)} বিক্রি</Badge>
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
              {stats.lowStock.map((m, idx) => (
                <li key={m.id}>
                  <Link
                    to={`/stocks?focus=${encodeURIComponent(m.id)}&edit=1`}
                    style={{ animationDelay: `${540 + idx * 55}ms` }}
                    className="home-card-appear group flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 px-4 py-[18px] text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:px-5 sm:py-[22px] dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
                    aria-label={`${m.name} এর স্টক দেখুন`}
                  >
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 text-xl leading-none select-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95 dark:bg-white/10">
                      ⚠️
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
 * rich blue gradient, glossy premium 3D finish (embossed
 * digits), tap to reveal the amount, and a bottom Income / Expense split.
 */
function BalanceCardSkeleton() {
  return (
    <Skeleton aria-busy="true" aria-label="Loading" className="aspect-[16/10] sm:aspect-[1.586/1] w-full max-w-[440px] rounded-[24px]" />
  );
}

const QUICK_TINTS = {
  brand: { bg: "border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5" },
  rose: { bg: "border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5" },
} as const;

function QuickAction({
  emoji,
  label,
  to,
  tint,
  delay = 0,
}: {
  emoji: string;
  label: string;
  to: string;
  tint: keyof typeof QUICK_TINTS;
  delay?: number;
}) {
  const t = QUICK_TINTS[tint];
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className={`home-card-appear group flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-2xl px-2.5 py-3.5 sm:px-4 sm:py-5 text-center transition-all duration-200 hover:-translate-y-1 active:scale-[0.95] ${t.bg}`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-[100px] bg-white/60 text-lg sm:text-2xl leading-none select-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95 dark:bg-white/10"
      >
        {emoji}
      </span>
      <span className="text-xs sm:text-[13px] font-semibold sm:font-medium text-foreground leading-tight">{label}</span>
    </Link>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5" aria-busy="true" aria-label="Loading">
      <CardContent className="p-3 sm:p-4 md:p-5">
        <div className="flex flex-col justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between gap-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-[100px]" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  emoji,
  gradient,
  label,
  value,
  sub,
  tone,
  delay = 0,
}: {
  emoji: string;
  gradient: "brand" | "rose";
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
  delay?: number;
}) {
  // Permanent Branding Rule:
  // Revenue / Healthy = brand-blue tint, Expense / Due / Low Stock = rose tint.
  const STYLE = {
    brand: { card: "border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5" },
    rose: { card: "border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5" },
  } as const;
  const s = STYLE[gradient];

  return (
    <Card
      style={{ animationDelay: `${delay}ms` }}
      className={`home-card-appear group rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${s.card}`}
    >
      <CardContent className="p-3 sm:p-4 md:p-5">
        <div className="flex flex-col justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between gap-1.5">
            <p className={typography("stat-label", "truncate text-xs sm:text-[13px] font-medium text-foreground/75")}>{label}</p>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 text-lg sm:text-2xl leading-none select-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95 dark:bg-white/10">
              <span aria-hidden="true">{emoji}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p aria-hidden="true" className={typography("h4", "truncate text-base sm:text-xl font-bold")}>{value}</p>
            {sub && <p className={typography("stat-sub", "mt-0.5 truncate text-[11px]")}>{sub}</p>}
          </div>
        </div>
        {tone === "warn" && (
          <span className="sr-only">
            warning
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default Index;
