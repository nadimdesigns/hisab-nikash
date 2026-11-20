import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShop, SaleItem } from "@/store/shop";
import { currency, formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { clearDraft, loadDrafts, saveDraft } from "@/lib/drafts";
import { useDraftsListener } from "@/hooks/use-drafts-listener";
import { typography } from "@/lib/typography";
import { ProductPickerSheet } from "@/components/ProductPickerSheet";
import { QtyStepper } from "@/components/QtyStepper";
import { loadProfiles, PROFILES_KEY } from "@/lib/customerProfiles";
import { unitLabel } from "@/lib/copy";

export default function NewInvoiceCard({ className, title = "Cash Sale" }: { className?: string; title?: string }) {
  const { products, recordSale, sales } = useShop();
  const invoiceSaleType: "cash" | "credit" = title === "Due Sale" || title === "বাকি বিক্রি" ? "credit" : "cash";
  const initialDrafts = useMemo(() => loadDrafts(), []);
  const [customer, setCustomer] = useState(initialDrafts.cash?.customer ?? "");
  const [items, setItems] = useState<SaleItem[]>(initialDrafts.cash?.items ?? []);
  const [pickId, setPickId] = useState<string>("");
  // Drives the quantity stepper's increment: কেজি moves in quarters, পিস in ones.
  const pickedProduct = products.find((m) => m.id === pickId);
  const [qty, setQty] = useState<number>(1);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    saveDraft("cash", { customer, items });
  }, [customer, items]);

  useDraftsListener(() => {
    const drafts = loadDrafts();
    const next = drafts.cash?.items ?? [];
    setItems((prev) => {
      const sameLength = prev.length === next.length;
      const sameRefs = sameLength && prev.every((p, i) =>
        p.productId === next[i].productId && p.qty === next[i].qty
      );
      return sameRefs ? prev : next;
    });
  });

  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.unitPrice, 0), [items]);

  const addItemFor = (productId: string, quantity: number) => {
    const m = products.find((x) => x.id === productId);
    if (!m) return;
    if (quantity <= 0) return;
    if (m.stock < quantity) {
      toast({ title: `স্টকে আছে মাত্র ${m.stock}`, variant: "destructive" });
      return;
    }
    const existing = items.find((i) => i.productId === m.id);
    if (existing) {
      setItems(items.map((i) => i.productId === m.id ? { ...i, qty: quantity } : i));
    } else {
      setItems([...items, { productId: m.id, name: m.name, qty: quantity, unitPrice: m.sellPrice, unitCost: m.costPrice }]);
    }
  };

  const handleSelectProduct = (id: string) => {
    setPickId(id);
    const existing = items.find((i) => i.productId === id);
    const initialQty = existing ? existing.qty : 1;
    setQty(initialQty);
    if (!existing) {
      addItemFor(id, 1);
    }
  };

  const handleQtyChange = (value: number) => {
    const next = Number.isFinite(value) && value > 0 ? value : 1;
    setQty(next);
    if (pickId) addItemFor(pickId, next);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.productId !== id));
    if (pickId === id) {
      setPickId("");
      setQty(1);
    }
  };

  const checkout = () => {
    if (items.length === 0) {
      toast({ title: "কমপক্ষে একটি আইটেম যোগ করুন", variant: "destructive" });
      return;
    }
    if (invoiceSaleType === "credit" && !customer.trim()) {
      toast({ title: "একটি কাস্টমার নির্বাচন করুন", variant: "destructive" });
      return;
    }
    const sale = recordSale({
      customer: invoiceSaleType === "credit" ? customer.trim() || "অজানা" : "অজানা",
      items,
      saleType: invoiceSaleType,
    });
    if (!sale) {
      toast({ title: "এক বা একাধিক পণ্যের স্টক অপ্রতুল", variant: "destructive" });
      return;
    }
    setItems([]);
    setCustomer("");
    clearDraft("cash");
    toast({ title: "বিক্রি সংরক্ষিত হয়েছে", description: `চালানের মোট ${currency(sale.total)}` });
  };

  // Existing customer names derived from past sales AND saved customer
  // profiles — used as the dropdown source for Due Sale.
  const [profileNames, setProfileNames] = useState<string[]>(() =>
    Object.keys(loadProfiles()),
  );
  useEffect(() => {
    const refresh = () => setProfileNames(Object.keys(loadProfiles()));
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILES_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sales) {
      const n = (s.customer || "").trim();
      if (n && n.toLowerCase() !== "unknown") set.add(n);
    }
    for (const n of profileNames) {
      const t = n.trim();
      if (t && t.toLowerCase() !== "unknown") set.add(t);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [sales, profileNames]);

  const isCredit = invoiceSaleType === "credit";
  const tone = isCredit
    ? {
        border: "border-rose-100 dark:border-rose-500/20",
        label: "text-rose-400 dark:text-rose-300",
        pillBg: "bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-500/20",
        pillText: "text-rose-600 dark:text-rose-300",
        pillDot: "bg-rose-500",
        pillLabel: "বাকি বিক্রি",
        focus: "focus-visible:ring-rose-500/20 focus-visible:border-rose-500",
        emptyHover: "hover:border-rose-300 dark:hover:border-rose-500/40",
        gradient: "from-rose-500 to-red-600",
        gradientHover: "hover:from-rose-600 hover:to-red-700",
      }
    : {
        border: "border-brand-100 dark:border-brand-500/20",
        label: "text-brand-500 dark:text-brand-300",
        pillBg: "bg-brand-50 border-brand-100 dark:bg-brand-950/40 dark:border-brand-500/20",
        pillText: "text-brand-600 dark:text-brand-300",
        pillDot: "bg-brand-500",
        pillLabel: "পরিশোধিত",
        focus: "focus-visible:ring-brand-500/20 focus-visible:border-brand-500",
        emptyHover: "hover:border-brand-300 dark:hover:border-brand-500/40",
        gradient: "from-brand-500 to-brand-700",
        gradientHover: "hover:from-brand-600 hover:to-brand-800",
      };

  return (
    <div
      style={{ animationDelay: "60ms" }}
      className={
        className ??
        (isCredit
          ? "home-hero-appear w-full min-w-0 overflow-hidden rounded-3xl border border-rose-200 dark:border-rose-500/25 bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/15 dark:to-rose-500/5"
          : "home-hero-appear w-full min-w-0 overflow-hidden rounded-3xl border border-brand-200 dark:border-brand-500/25 bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-500/15 dark:to-brand-500/5")
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-5 sm:px-6">
        <div>
          <h2 className={typography("h4", "m-0 leading-tight")}>{formatDate(now, "MMMM d, yyyy")}</h2>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${tone.pillBg}`}>
          <span className={`h-2 w-2 rounded-full ${tone.pillDot} animate-pulse`} />
          <span className={`text-xs font-bold uppercase tracking-tight ${tone.pillText}`}>
            {tone.pillLabel}
          </span>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4 px-5 sm:px-6">
        {isCredit && (
          <div>
            <label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
              কাস্টমারের নাম
            </label>
            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger className={`h-[46px] rounded-xl bg-white dark:bg-white/10 ${tone.focus}`}>
                <SelectValue placeholder="কাস্টমার বাছাই করুন..." />
              </SelectTrigger>
              <SelectContent>
                {customerOptions.length === 0 ? (
                  <div className={typography("body-muted", "px-3 py-2")}>
                    এখনো কোনো কাস্টমার নেই। নতুন কাস্টমার থেকে যোগ করুন।
                  </div>
                ) : (
                  customerOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6 min-w-0">
            <label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
              পণ্যের নাম
            </label>
            <ProductPickerSheet
              products={products}
              value={pickId}
              onChange={handleSelectProduct}
              placeholder="পণ্য বাছাই করুন..."
              disableOutOfStock
              showSaleInfo
              className={`h-[46px] rounded-xl bg-white hover:bg-white dark:bg-white/10 dark:hover:bg-white/10 ${tone.focus}`}
            />
          </div>
          <div className="col-span-6">
            <label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
              পরিমাণ{pickedProduct ? ` (${unitLabel(pickedProduct.unit)})` : ""}
            </label>
            <QtyStepper
              value={qty}
              onChange={handleQtyChange}
              unit={pickedProduct?.unit}
              showUnit={false}
              className="h-[46px] rounded-xl bg-white dark:bg-white/10"
            />
          </div>
        </div>
      </div>

      {/* Items area */}
      <div className="mt-6 px-5 sm:px-6">
        {items.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white/70 p-8 transition-colors ${tone.emptyHover}`}
          >
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-[100px] bg-white/60 dark:bg-white/10">
              <span aria-hidden="true" className="text-xl leading-none select-none">➕</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">এখনো কোনো আইটেম যোগ হয়নি</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li
                key={i.productId}
                onClick={() => {
                  setPickId(i.productId);
                  setQty(i.qty);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-[18px] transition-all hover:bg-white dark:bg-white/10 dark:hover:bg-white/15 ${
                  pickId === i.productId ? "ring-2 ring-brand-600/50 dark:ring-brand-400/50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.qty} × {currency(i.unitPrice)}
                  </p>
                </div>
                <span
                  className={
                    isCredit
                      ? "shrink-0 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400"
                      : "shrink-0 text-sm font-bold tabular-nums text-brand-700 dark:text-brand-300"
                  }
                >
                  {currency(i.qty * i.unitPrice)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 rounded-[100px] bg-white/60 text-rose-600 hover:bg-rose-50 dark:bg-white/10 dark:text-rose-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(i.productId);
                  }}
                >
                  <span aria-hidden="true" className="text-sm leading-none select-none">🗑️</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary + Save */}
      <div className="px-5 pb-6 pt-2 sm:px-6">
        <div className="mb-5 mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-semibold text-muted-foreground">সর্বমোট</span>
          <span className={typography("h3", "m-0 tracking-tight tabular-nums")}>{currency(total)}</span>
        </div>

        <Button
          onClick={checkout}
          disabled={items.length === 0}
          size="lg"
          className={`w-full rounded-2xl bg-gradient-to-r ${tone.gradient} ${tone.gradientHover} py-4 font-bold tracking-wide text-white transition-all active:scale-[0.98]`}
        >
          <span aria-hidden="true" className="text-base leading-none select-none">💾</span>
          {isCredit ? "বাকি বিক্রি সংরক্ষণ" : "নগদ বিক্রি সংরক্ষণ"}
        </Button>
      </div>
    </div>
  );
}

