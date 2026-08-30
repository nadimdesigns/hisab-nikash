import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useShop, useShopHydrated } from "@/store/shop";
import { bnNumber, currency, currencyCompact, formatDate } from "@/lib/format";
import { AlertTriangle, TrendingUp, Wallet, LineChart, Package, ShoppingCart, UserPlus, Receipt, Share, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { subDays, startOfDay } from "date-fns";
import { typography } from "@/lib/typography";
import { unitLabel } from "@/lib/copy";

const Index = () => {
  const { products, sales, purchases } = useShop();
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

    // Cash in hand: everything paid in (cash sales + any partial/credit
    // payments received) minus money spent on stock (purchases).
    const cashReceived = sales.reduce(
      (s, x) => s + (x.saleType === "credit" ? (x.amountPaid ?? 0) : x.total),
      0
    );
    const cashSpent = purchases.reduce((s, p) => s + p.total, 0);
    const cashBalance = cashReceived - cashSpent;

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

    return { inventoryValue, lowStock, bestSelling, todayRevenue, monthRevenue, monthProfit, cashBalance };
  }, [products, sales, purchases]);

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
        {hydrated ? <BalanceCard balance={stats.cashBalance} /> : <BalanceCardSkeleton />}

        <div className="grid grid-cols-3 gap-3">
          <QuickAction icon={ShoppingCart} label="নতুন বিক্রি" to="/new-sale" tint="emerald" />
          <QuickAction icon={UserPlus} label="নতুন কাস্টমার" to="/new-customer" tint="sky" />
          <QuickAction icon={Receipt} label="খরচ যোগ করুন" to="/new-transaction" tint="amber" />
        </div>

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

/**
 * Credit-card style cash balance card (Bank Asia app inspiration): dark→bright
 * teal/emerald gradient, glowing wave lines, "Tap for Balance" reveal.
 */
function BalanceCard({ balance }: { balance: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed((v) => !v)}
      aria-label={revealed ? "ব্যালেন্স লুকান" : "ব্যালেন্স দেখুন"}
      className="relative w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-teal-800 via-teal-600 to-emerald-500 p-5 text-left text-white shadow-elevated transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Glowing wave lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden>
        <path d="M0 150 Q 50 115, 100 150 T 200 150 T 300 150 T 400 150" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" />
        <path d="M0 185 Q 50 150, 100 185 T 200 185 T 300 185 T 400 185" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" />
        <path d="M0 215 Q 50 185, 100 215 T 200 215 T 300 215 T 400 215" stroke="rgba(255,255,255,0.07)" strokeWidth="2" fill="none" />
      </svg>

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-contain shadow-md" />
          <span className="text-sm font-semibold">হিসাব নিকাশ</span>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide">Active</span>
      </div>

      <div className="relative mt-8">
        <p className="text-[11px] uppercase tracking-wider text-white/70">Tap for Balance</p>
        <p className="mt-1.5 text-[34px] font-bold leading-none tracking-tight tabular-nums">
          {revealed ? currency(balance) : "৳ ••••"}
        </p>
      </div>

      <div className="relative mt-7 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-white/70">নগদ ব্যালেন্স</p>
          <p className="mt-0.5 text-xs font-medium text-white/90">মুদি দোকান · ********</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Share className="h-4 w-4 text-white/90" />
        </span>
      </div>
    </button>
  );
}

function BalanceCardSkeleton() {
  return (
    <Skeleton aria-busy="true" aria-label="Loading" className="h-[210px] w-full rounded-[24px]" />
  );
}

const QUICK_TINTS = {
  emerald: { icon: "text-emerald-600 dark:text-emerald-300", bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5" },
  sky: { icon: "text-sky-600 dark:text-sky-300", bg: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-500/15 dark:to-sky-500/5" },
  amber: { icon: "text-amber-600 dark:text-amber-300", bg: "bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-500/15 dark:to-amber-500/5" },
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
      className={`flex flex-col items-center gap-2 rounded-2xl border-0 p-4 text-center shadow-soft transition-transform active:scale-[0.97] ${t.bg}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-white/10">
        <Icon className={`h-5 w-5 ${t.icon}`} strokeWidth={2.2} />
      </span>
      <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
    </Link>
  );
}

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
