import { useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useShop, useShopHydrated } from "@/store/shop";
import { bnNumber, currency, currencyCompact, formatDate } from "@/lib/format";
import { AlertTriangle, TrendingUp, Wallet, LineChart, Package, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { subDays, startOfDay } from "date-fns";
import { typography } from "@/lib/typography";
import { unitLabel } from "@/lib/copy";

const Index = () => {
  const { products, sales } = useShop();
  const hydrated = useShopHydrated();

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

    return { inventoryValue, lowStock, bestSelling, todayRevenue, monthRevenue, monthProfit };
  }, [products, sales]);

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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {hydrated ? (
          <>
            <StatCard icon={Wallet} gradient="sky" label="আজকের বিক্রি" value={currencyCompact(stats.todayRevenue)} />
            <StatCard icon={LineChart} gradient="emerald" label="৩০ দিনের লাভ" value={currencyCompact(stats.monthProfit)} />
            <StatCard icon={Package} gradient="violet" label="স্টকের মূল্য" value={currencyCompact(stats.inventoryValue)} />
            <StatCard icon={AlertTriangle} gradient="amber" label="কম স্টক" value={bnNumber(stats.lowStock.length)} tone={stats.lowStock.length > 0 ? "warn" : "ok"} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
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

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> সবচেয়ে বেশি বিক্রি
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hydrated ? (
              <ul className="space-y-[17px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
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
              <ul className="space-y-[17px]">
                {stats.bestSelling.map((p, idx) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <div className={typography("body", "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary")}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={typography("body-strong", "truncate")}>{p.name}</p>
                      <p className={typography("body-muted")}>{currency(p.revenue)} বিক্রি</p>
                    </div>
                    <Badge variant="secondary">{bnNumber(p.qty)} বিক্রি</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.lowStock.length > 0 && (
        <Card className="mt-6 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> কম স্টকের পণ্য
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {stats.lowStock.map((m) => (
                <Link
                  key={m.id}
                  to={`/edit-product/${m.id}`}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${m.name} এর স্টক দেখুন`}
                >
                  <div>
                    <p className={typography("body-strong")}>{m.name}</p>
                    <p className={typography("body-muted")}>{m.sku}</p>
                  </div>
                  <Badge variant="destructive">{bnNumber(m.stock)} {unitLabel(m.unit)} বাকি</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

function StatCardSkeleton() {
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

function StatCard({
  icon: Icon,
  gradient,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  gradient: "sky" | "emerald" | "violet" | "amber";
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  // Soft pastel gradient card (Schoolzee style): translucent white icon
  // chip on a tinted gradient, deeper icon color, dark mode = faint tint.
  const STYLE = {
    sky: { card: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-500/15 dark:to-sky-500/5", icon: "text-sky-600 dark:text-sky-300" },
    emerald: { card: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5", icon: "text-emerald-600 dark:text-emerald-300" },
    violet: { card: "bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-500/15 dark:to-violet-500/5", icon: "text-violet-600 dark:text-violet-300" },
    amber: { card: "bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-500/15 dark:to-amber-500/5", icon: "text-amber-600 dark:text-amber-300" },
  } as const;
  const s = STYLE[gradient];

  return (
    <Card className={`border-0 rounded-2xl shadow-soft ${s.card}`}>
      <CardContent className="p-3 pl-[22px] md:p-5 md:pl-5 md:pt-3">
        <div className="flex flex-row-reverse items-center gap-2.5 md:flex-row md:gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm dark:bg-white/10 md:h-14 md:w-14">
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
