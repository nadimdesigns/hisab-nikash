import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { useShop, useShopHydrated, type PurchaseItem } from "@/store/shop";
import { currency } from "@/lib/format";
import { format } from "date-fns";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ProductPickerSheet } from "@/components/ProductPickerSheet";
import { QtyStepper } from "@/components/QtyStepper";

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

type Tab = "list" | "purchase";

const TAB_GRADIENT = "bg-emerald-900 text-white";

export default function Expenses() {
  const { purchases, products, recordPurchase } = useShop();
  const hydrated = useShopHydrated();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("action") === "new" || searchParams.get("tab") === "purchase"
      ? "purchase"
      : "list",
  );
  const [type, setType] = useState<ExpenseType>("all");
  const [q, setQ] = useState("");

  // ===== Purchase form state =====
  const [supplier, setSupplier] = useState("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [pickId, setPickId] = useState("");
  // Drives the quantity stepper's increment: কেজি moves in quarters, পিস in ones.
  const pickedProduct = products.find((m) => m.id === pickId);
  const [qty, setQty] = useState<number>(10);
  const [cost, setCost] = useState<number>(0);

  const rows: ExpenseRow[] = useMemo(() => {
    const all: ExpenseRow[] = purchases.map((p) => ({
      id: p.id,
      date: p.date,
      type: "purchase",
      typeLabel: "ক্রয়",
      party: p.supplier,
      detail: `${p.items.length}টি আইটেম`,
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

  const purchaseTotal = useMemo(
    () => items.reduce((s, i) => s + i.qty * i.unitCost, 0),
    [items],
  );

  const handlePick = (v: string) => {
    const m = products.find((x) => x.id === v);
    if (!m) return;
    setPickId(v);
    setCost(m.costPrice);
    if (qty < 1) return;
    const existing = items.find((i) => i.productId === m.id);
    if (existing) {
      setItems(items.map((i) => i.productId === m.id ? { ...i, qty: i.qty + qty } : i));
    } else {
      setItems([...items, { productId: m.id, name: m.name, qty, unitCost: m.costPrice }]);
    }
    setPickId("");
    setQty(10);
    setCost(0);
  };

  const submit = () => {
    if (!supplier.trim()) return toast({ title: "পাইকারের নাম প্রয়োজন", variant: "destructive" });
    if (items.length === 0) return toast({ title: "অন্তত একটি আইটেম যোগ করুন", variant: "destructive" });
    recordPurchase({
      supplier,
      supplierCompany: supplierCompany.trim() || undefined,
      supplierPhone: supplierPhone.trim() || undefined,
      items,
    });
    setItems([]); setSupplier(""); setSupplierCompany(""); setSupplierPhone("");
    toast({ title: "ক্রয় সংরক্ষিত হয়েছে — স্টক হালনাগাদ হয়েছে" });
    setTab("list");
  };

  const tabBtn = (v: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(v)}
      className={cn(
        "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
        tab === v
          ? cn("border-transparent", TAB_GRADIENT)
          : "border-border bg-card text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );

  return (
    <AppLayout title="খরচ">
      <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
        {/* Tab bar: খরচের তালিকা | নতুন ক্রয় */}
        <div className="flex w-full items-center gap-2">
          {tabBtn("list", "খরচের তালিকা")}
          {tabBtn("purchase", "নতুন ক্রয়")}
        </div>

        {tab === "list" ? (
          <Card className="min-w-0 max-w-full overflow-hidden border-0 bg-transparent">
            <CardHeader className="px-0 pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className={typography("h4", "m-0")}>সব খরচ</CardTitle>
                <Button size="sm" onClick={() => setTab("purchase")}>
                  <Plus className="mr-1 h-4 w-4" /> নতুন ক্রয়
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <Select value={type} onValueChange={(v) => setType(v as ExpenseType)}>
                  <SelectTrigger className="bg-white dark:bg-white/5">
                    <SelectValue placeholder="লেনদেনের ধরন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব ধরনের</SelectItem>
                    <SelectItem value="purchase">ক্রয়</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="পাইকার বা ধরন অনুযায়ী খুঁজুন…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="bg-white dark:bg-white/5"
                />
              </div>

              {!hydrated ? (
                <ul className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 p-3 dark:from-rose-500/15 dark:to-rose-500/5"
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
              ) : filtered.length === 0 ? (
                <div
                  className={typography(
                    "body-muted",
                    "rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 py-8 text-center dark:from-rose-500/15 dark:to-rose-500/5",
                  )}
                >
                  এখনও কোনো খরচের লেনদেন নেই।
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-2xl border-0 bg-gradient-to-br from-rose-100 to-rose-50 p-3 sm:p-4 dark:from-rose-500/15 dark:to-rose-500/5"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 dark:bg-white/10 dark:text-rose-300">
                        <ArrowUpRight className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {r.party}
                          </span>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            −{currency(r.amount)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-white/10 dark:text-rose-300">
                            {r.typeLabel}
                          </span>
                          <span className="truncate">
                            {r.detail} · {format(new Date(r.date), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-end gap-[15px]">
                <p className={typography("body-muted")}>
                  মোট ({filtered.length}টি লেনদেন)
                </p>
                <p className={typography("h3", "text-rose-600 dark:text-rose-400")}>{currency(total)}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="min-w-0 max-w-full overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/15 dark:to-rose-500/5">
            <CardContent className="space-y-4 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="p-supplier" className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
                    পাইকারের নাম
                  </Label>
                  <Input
                    id="p-supplier"
                    placeholder="পাইকারের নাম"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="h-12 rounded-2xl bg-white dark:bg-white/10"
                  />
                </div>
                <Input
                  placeholder="পাইকারের কোম্পানির নাম"
                  value={supplierCompany}
                  onChange={(e) => setSupplierCompany(e.target.value)}
                  className="h-12 rounded-2xl bg-white dark:bg-white/10"
                />
                <Input
                  type="tel"
                  placeholder="পাইকারের ফোন নম্বর"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="h-12 rounded-2xl bg-white dark:bg-white/10"
                />
              </div>

              <div className="flex w-full items-start gap-2">
                <div className="w-1/2 min-w-0">
                  <ProductPickerSheet
                    products={products}
                    value={pickId}
                    onChange={handlePick}
                    placeholder="পণ্য নির্বাচন করুন..."
                    className="h-12 rounded-2xl bg-white hover:bg-white dark:bg-white/10 dark:hover:bg-white/10"
                  />
                </div>
                <div className="w-1/2">
                  <QtyStepper value={qty} onChange={setQty} unit={pickedProduct?.unit} className="h-12 rounded-2xl bg-white dark:bg-white/10" />
                </div>
              </div>

              <div>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(+e.target.value)}
                  placeholder="ইউনিট খরচ"
                  className="h-12 rounded-2xl bg-white dark:bg-white/10"
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border bg-white/70">
                <Table className="table-global">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[36%]">আইটেম</TableHead>
                      <TableHead className="text-center">পরিমাণ</TableHead>
                      <TableHead className="text-right">ইউনিট খরচ</TableHead>
                      <TableHead className="text-right">সাবটোটাল</TableHead>
                      <TableHead className="w-9" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className={typography("body-muted", "py-6 text-center")}>
                          এখনো কোনো আইটেম নেই।
                        </TableCell>
                      </TableRow>
                    ) : items.map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="w-[36%] font-medium">
                          <span className="item-name-cell">{i.name}</span>
                        </TableCell>
                        <TableCell className="text-right">{i.qty}</TableCell>
                        <TableCell className="text-right">{currency(i.unitCost)}</TableCell>
                        <TableCell className="text-right">{currency(i.qty * i.unitCost)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== idx))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end gap-[15px]">
                <p className={typography("body-muted")}>মোট</p>
                <p className={typography("h3")}>{currency(purchaseTotal)}</p>
              </div>

              <Button onClick={submit} className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold transition-transform hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]" size="lg" disabled={items.length === 0}>
                ক্রয় সংরক্ষণ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
