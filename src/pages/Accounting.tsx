import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useShop, useShopHydrated, type PurchaseItem, type SaleItem } from "@/store/shop";
import { loadPayments, PAYMENTS_KEY, type PaymentEntry } from "@/lib/customerPaymentsLog";
import { applyCustomerPayment, DUES_KEY } from "@/lib/customerPayments";
import { loadProfiles, PROFILES_KEY } from "@/lib/customerProfiles";
import { isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";
import { currency, formatDate } from "@/lib/format";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ListFilter,
  PackagePlus,
  Save,
  Trash2,
  Wallet,
} from "lucide-react";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ProductPickerSheet } from "@/components/ProductPickerSheet";
import { QtyStepper } from "@/components/QtyStepper";

type AllTxnType = "Cash Sale" | "Due Sale" | "New Payment" | "Purchase" | "Expense";
type AllTxn = {
  id: string;
  type: AllTxnType;
  date: string;
  reference: string;
  summary: string;
  amount: number;
};

type DueEntry = {
  id: string;
  date: string;
  customer: string;
  items: SaleItem[];
  total: number;
};

const loadDues = (): DueEntry[] => {
  try {
    const raw = localStorage.getItem(DUES_KEY);
    return raw ? (JSON.parse(raw) as DueEntry[]) : [];
  } catch {
    return [];
  }
};

/** Bangla labels for transaction types (English values kept for filtering). */
const TXN_TYPE_LABEL: Record<AllTxnType, string> = {
  "Cash Sale": "নগদ বিক্রি",
  "Due Sale": "বাকি বিক্রি",
  "New Payment": "নগদ পেমেন্ট",
  "Purchase": "ক্রয়",
  "Expense": "খরচ",
};

/** খরচ filter shows the same rows as ক্রয় (purchases are the expense records). */
const EXPENSE_ALIASES: AllTxnType[] = ["Purchase", "Expense"];

type AccountingTab = "list" | "payment" | "purchase";

export default function Accounting() {
  const { sales, purchases, products, recordPurchase, updateSale } = useShop();
  const hydrated = useShopHydrated();

  const [searchParams, setSearchParams] = useSearchParams();
  const resolveTab = (params: URLSearchParams): AccountingTab => {
    const t = params.get("tab");
    if (t === "payment") return "payment";
    if (t === "purchase" || params.get("new") === "1") return "purchase";
    return "list";
  };

  const [tab, setTabState] = useState<AccountingTab>(() => resolveTab(searchParams));

  useEffect(() => {
    setTabState(resolveTab(searchParams));
  }, [searchParams]);

  const setTab = (nextTab: AccountingTab) => {
    setTabState(nextTab);
    const next = new URLSearchParams(searchParams);
    if (nextTab === "list") {
      next.delete("tab");
    } else {
      next.set("tab", nextTab);
    }
    next.delete("new");
    setSearchParams(next, { replace: true });
  };

  const [allTypeFilter, setAllTypeFilter] = useState<"all" | AllTxnType>("all");
  const [payments, setPayments] = useState<PaymentEntry[]>(() => loadPayments());
  const [dues, setDues] = useState<DueEntry[]>(() => loadDues());
  const [profileNames, setProfileNames] = useState<string[]>(() => Object.keys(loadProfiles()));
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PAYMENTS_KEY) setPayments(loadPayments());
      if (e.key === DUES_KEY) setDues(loadDues());
      if (e.key === PROFILES_KEY) setProfileNames(Object.keys(loadProfiles()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ===== Payment (টাকা জমা) form state =====
  const [payCustomer, setPayCustomer] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const customerDueMap = useMemo(() => {
    const map = new Map<string, number>();
    profileNames.forEach((n) => {
      const k = n.trim();
      if (k) map.set(k, 0);
    });
    sales.forEach((s) => {
      const k = (s.customer || "").trim();
      if (!k || k.toLowerCase() === "unknown") return;
      const paid = s.amountPaid ?? ((s.saleType ?? "cash") === "credit" ? 0 : s.total);
      const out = Math.max(0, s.total - Math.max(0, Math.min(paid, s.total)));
      map.set(k, (map.get(k) ?? 0) + out);
    });
    dues.forEach((d) => {
      const k = (d.customer || "").trim();
      if (!k) return;
      map.set(k, (map.get(k) ?? 0) + d.total);
    });
    return map;
  }, [sales, dues, profileNames]);

  const customerDueOptions = useMemo(() => {
    return Array.from(customerDueMap.entries())
      .map(([name, due]) => ({ name, due: Math.round(due * 100) / 100 }))
      .sort((a, b) => b.due - a.due || a.name.localeCompare(b.name, "bn"));
  }, [customerDueMap]);

  const selectedCustomerDue = payCustomer ? (customerDueMap.get(payCustomer) ?? 0) : 0;

  const submitPayment = () => {
    if (isReadOnly()) {
      notifyReadOnlyBlocked();
      return;
    }
    if (!payCustomer.trim()) {
      return toast({ title: "একজন কাস্টমার নির্বাচন করুন", variant: "destructive" });
    }
    const amount = parseFloat(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return toast({ title: "সঠিক টাকার পরিমাণ দিন", variant: "destructive" });
    }
    if (selectedCustomerDue <= 0) {
      return toast({ title: "এই কাস্টমারের কোনো বকেয়া নেই", variant: "destructive" });
    }
    if (amount > selectedCustomerDue + 0.005) {
      return toast({
        title: "পরিমাণ বকেয়ার বেশি",
        description: `${payCustomer} এর বকেয়া ${currency(selectedCustomerDue)}।`,
        variant: "destructive",
      });
    }
    const applied = applyCustomerPayment(
      payCustomer,
      amount,
      {
        sales,
        dues,
        updateSale,
        setDues: (next) => setDues(next),
      },
      payNote,
    );
    setPayments(loadPayments());
    setPayAmount("");
    setPayNote("");
    toast({
      title: "টাকা জমা সংরক্ষিত হয়েছে",
      description: `${currency(applied)} ${payCustomer} এর হিসাবে জমা হয়েছে।`,
    });
    setTab("list");
  };

  // ===== Purchase (নতুন ক্রয় / খরচ) form state =====
  const [supplier, setSupplier] = useState("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [pickId, setPickId] = useState("");
  const pickedProduct = products.find((m) => m.id === pickId);
  const [qty, setQty] = useState<number>(10);
  const [cost, setCost] = useState<number>(0);

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
      setItems(items.map((i) => (i.productId === m.id ? { ...i, qty: i.qty + qty } : i)));
    } else {
      setItems([...items, { productId: m.id, name: m.name, qty, unitCost: m.costPrice }]);
    }
    setPickId("");
    setQty(10);
    setCost(0);
  };

  const submitPurchase = () => {
    if (!supplier.trim()) return toast({ title: "পাইকারের নাম প্রয়োজন", variant: "destructive" });
    if (items.length === 0) return toast({ title: "অন্তত একটি আইটেম যোগ করুন", variant: "destructive" });
    recordPurchase({
      supplier,
      supplierCompany: supplierCompany.trim() || undefined,
      supplierPhone: supplierPhone.trim() || undefined,
      items,
    });
    setItems([]);
    setSupplier("");
    setSupplierCompany("");
    setSupplierPhone("");
    toast({ title: "ক্রয় সংরক্ষিত হয়েছে — স্টক হালনাগাদ হয়েছে" });
    setTab("list");
  };

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
    payments.forEach((pay) => {
      rows.push({
        id: `payment-${pay.id}`,
        type: "New Payment",
        date: pay.date,
        reference: pay.customer || "—",
        summary: pay.note ? `পেমেন্ট · ${pay.note}` : "নগদ পেমেন্ট",
        amount: pay.amount,
      });
    });
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, purchases, payments]);

  const filteredAllTransactions = useMemo(() => {
    return allTransactionsList.filter((t) => {
      if (allTypeFilter === "all") return true;
      if (allTypeFilter === "Expense") return EXPENSE_ALIASES.includes(t.type);
      return t.type === allTypeFilter;
    });
  }, [allTransactionsList, allTypeFilter]);

  return (
    <AppLayout title={tab === "payment" ? "টাকা জমা" : tab === "purchase" ? "নতুন ক্রয় / খরচ" : "হিসাব"}>
      <div className="space-y-4">
        {/* Pill Tab Switcher: সব হিসাব | টাকা জমা | নতুন ক্রয় / খরচ */}
        <div
          role="tablist"
          aria-label="হিসাব ও লেনদেন ট্যাব"
          className={cn(
            "grid grid-cols-3 gap-1.5 rounded-full p-1 transition-colors",
            tab === "purchase"
              ? "bg-rose-100/70 dark:bg-rose-500/15"
              : "bg-emerald-100/60 dark:bg-emerald-500/15",
          )}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "list"}
            onClick={() => setTab("list")}
            className={cn(
              "flex items-center justify-center rounded-full px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
              tab === "list"
                ? "bg-emerald-900 text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <span className="truncate">সব হিসাব</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "payment"}
            onClick={() => setTab("payment")}
            className={cn(
              "flex items-center justify-center rounded-full px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
              tab === "payment"
                ? "bg-emerald-900 text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <span className="truncate">টাকা জমা</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "purchase"}
            onClick={() => setTab("purchase")}
            className={cn(
              "flex items-center justify-center rounded-full px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
              tab === "purchase"
                ? "bg-rose-600 text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <span className="truncate">নতুন ক্রয় / খরচ</span>
          </button>
        </div>

        {tab === "payment" ? (
          /* ===== Inline টাকা জমা Form (Tint Green) ===== */
          <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-emerald-200 dark:border-emerald-500/25 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5 sm:px-6">
              <div>
                <h2 className={typography("h4", "m-0 leading-tight")}>
                  {formatDate(now, "MMMM d, yyyy")}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 dark:border-emerald-500/20 dark:bg-white/10">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-300">
                  টাকা জমা
                </span>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 px-5 text-muted-foreground sm:px-6">
              <span className="text-xs font-medium tabular-nums">
                {formatDate(now, "h:mm:ss a")}
              </span>
            </div>

            <div className="space-y-4 px-5 pb-6 sm:px-6">
              <div>
                <Label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
                  কাস্টমার নির্বাচন করুন
                </Label>
                <Select value={payCustomer} onValueChange={setPayCustomer}>
                  <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-white/10">
                    <SelectValue placeholder="কাস্টমার বাছাই করুন..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customerDueOptions.length === 0 ? (
                      <div className={typography("body-muted", "px-3 py-2")}>
                        এখনো কোনো কাস্টমার নেই।
                      </div>
                    ) : (
                      customerDueOptions.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} {c.due > 0 ? `(বাকি ${currency(c.due)})` : "(পরিশোধিত)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {payCustomer && (
                <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 dark:bg-white/10">
                  <span className="text-xs font-semibold text-muted-foreground">
                    বর্তমান বকেয়া
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      selectedCustomerDue > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {currency(selectedCustomerDue)}
                  </span>
                </div>
              )}

              <div>
                <Label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
                  জমার পরিমাণ (৳)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="টাকার পরিমাণ লিখুন..."
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="h-12 flex-1 rounded-2xl bg-white dark:bg-white/10"
                  />
                  {selectedCustomerDue > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPayAmount(String(selectedCustomerDue))}
                      className="h-12 shrink-0 rounded-2xl bg-white px-4 font-semibold text-emerald-700 hover:bg-white dark:bg-white/10 dark:text-emerald-300"
                    >
                      পুরো বকেয়া
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
                  নোট / বিবরণ (ঐচ্ছিক)
                </Label>
                <Input
                  placeholder="যেমন: বিকাশ / নগদ রসিদ..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="h-12 rounded-2xl bg-white dark:bg-white/10"
                />
              </div>

              <Button
                type="button"
                onClick={submitPayment}
                size="lg"
                className="w-full gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-bold text-white transition-transform hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
              >
                <Save className="h-4 w-4" />
                টাকা জমা সংরক্ষণ করুন
              </Button>
            </div>
          </div>
        ) : tab === "purchase" ? (
          /* ===== Inline নতুন ক্রয় / খরচ Form (Tint Red) ===== */
          <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-rose-200 dark:border-rose-500/25 bg-gradient-to-br from-rose-100 to-rose-50 px-4 py-5 dark:from-rose-500/15 dark:to-rose-500/5 sm:px-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-1">
                <div>
                  <h2 className={typography("h4", "m-0 leading-tight")}>
                    {formatDate(now, "MMMM d, yyyy")}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1.5 dark:border-rose-500/20 dark:bg-white/10">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-tight text-rose-600 dark:text-rose-300">
                    নতুন ক্রয় / খরচ
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="acc-supplier" className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
                    পাইকার বা খাতের নাম
                  </Label>
                  <Input
                    id="acc-supplier"
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

              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-white/70 py-8 text-center text-xs font-medium text-muted-foreground dark:bg-white/5">
                  এখনো কোনো আইটেম যোগ হয়নি।
                </div>
              ) : (
                <ul className="space-y-2">
                  {items.map((i, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-[18px] dark:bg-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{i.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.qty} × {currency(i.unitCost)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {currency(i.qty * i.unitCost)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 rounded-[100px] bg-white/60 text-rose-600 hover:bg-rose-50 dark:bg-white/10 dark:text-rose-300"
                        onClick={() => setItems(items.filter((_, j) => j !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <p className={typography("body-muted")}>সর্বমোট খরচ</p>
                <p className={typography("h3", "text-rose-600 dark:text-rose-400")}>{currency(purchaseTotal)}</p>
              </div>

              <Button
                onClick={submitPurchase}
                className="w-full gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 font-bold text-white transition-transform hover:from-rose-700 hover:to-red-700 active:scale-[0.98]"
                size="lg"
                disabled={items.length === 0}
              >
                <Save className="h-4 w-4" />
                ক্রয় সংরক্ষণ করুন
              </Button>
            </div>
          </div>
        ) : (
          /* ===== সব হিসাব তালিকা ===== */
          <>
            <div className="flex w-full items-center gap-2">
              <Select value={allTypeFilter} onValueChange={(v) => setAllTypeFilter(v as "all" | AllTxnType)}>
                <SelectTrigger className="h-12 w-full flex-1 gap-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-3 py-2 hover:from-emerald-200/70 hover:to-emerald-100/70 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5 dark:text-foreground md:h-10">
                  <SelectValue placeholder="সব ধরনের" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ধরনের</SelectItem>
                  <SelectItem value="Purchase">ক্রয়</SelectItem>
                  <SelectItem value="Expense">খরচ</SelectItem>
                  <SelectItem value="Cash Sale">নগদ বিক্রি</SelectItem>
                  <SelectItem value="Due Sale">বাকি বিক্রি</SelectItem>
                  <SelectItem value="New Payment">নগদ পেমেন্ট</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {!hydrated ? (
                <ul className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li
                      key={`all-sk-${i}`}
                      className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-4 py-[18px] dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
                    >
                      <Skeleton className="h-11 w-11 shrink-0 rounded-[100px] bg-white/60" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </li>
                  ))}
                </ul>
              ) : filteredAllTransactions.length === 0 ? (
                <div
                  className={typography(
                    "body-muted",
                    "rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 py-10 text-center dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5",
                  )}
                >
                  {allTypeFilter === "New Payment"
                    ? "এখনও কোনো পেমেন্ট রেকর্ড হয়নি।"
                    : "এখনও কোনো লেনদেন নেই।"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredAllTransactions.map((t) => {
                    const isRevenue = t.type === "Cash Sale" || t.type === "New Payment";
                    const isOutflow = t.type === "Purchase" || t.type === "Expense";
                    const Icon =
                      t.type === "Cash Sale"
                        ? ArrowDownLeft
                        : t.type === "New Payment"
                          ? Wallet
                          : t.type === "Due Sale"
                            ? Clock
                            : ArrowUpRight;

                    return (
                      <li
                        key={t.id}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-4 py-[18px] sm:px-5 sm:py-[22px]",
                          isRevenue
                            ? "border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
                            : "border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 dark:bg-white/10",
                            isRevenue
                              ? "text-emerald-600 dark:text-emerald-300"
                              : "text-rose-600 dark:text-rose-300",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-[6px]">
                              <span className="truncate text-sm font-semibold text-foreground">
                                {t.reference}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10",
                                  isRevenue
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-rose-700 dark:text-rose-300",
                                )}
                              >
                                {TXN_TYPE_LABEL[t.type]}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 text-sm font-bold tabular-nums",
                                isRevenue
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-rose-600 dark:text-rose-400",
                              )}
                            >
                              {isRevenue ? "+" : isOutflow ? "−" : ""}
                              {currency(t.amount)}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center text-xs text-muted-foreground">
                            <span className="truncate">
                              {t.summary} · {format(new Date(t.date), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-center justify-between px-1 pt-2">
                <p className={typography("body-muted")}>
                  {allTransactionsList.length}টি লেনদেনের মধ্যে {filteredAllTransactions.length}টি
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

