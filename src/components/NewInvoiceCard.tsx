import { useEffect, useMemo, useState } from "react";
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
import { Trash2, Receipt, Save } from "lucide-react";
import { useShop, SaleItem } from "@/store/shop";
import { currency, formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { clearDraft, loadDrafts, saveDraft } from "@/lib/drafts";
import { useDraftsListener } from "@/hooks/use-drafts-listener";
import { typography } from "@/lib/typography";
import { ProductPickerSheet } from "@/components/ProductPickerSheet";
import { QtyStepper } from "@/components/QtyStepper";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";
import { loadProfiles, PROFILES_KEY } from "@/lib/customerProfiles";

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
  const [saleType, setSaleType] = useState<string>("");
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
    if (quantity < 1) return;
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
    addItemFor(id, qty);
  };

  const handleQtyChange = (value: number) => {
    const next = Number.isFinite(value) && value > 0 ? value : 1;
    setQty(next);
    if (pickId) addItemFor(pickId, next);
  };

  const removeItem = (id: string) => setItems(items.filter((i) => i.productId !== id));

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
      customer: customer.trim() || "অজানা",
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
        shadow: "shadow-xl shadow-rose-100/50 dark:shadow-rose-950/30",
        label: "text-rose-400 dark:text-rose-300",
        pillBg: "bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-500/20",
        pillText: "text-rose-600 dark:text-rose-300",
        pillDot: "bg-rose-500",
        pillLabel: "বাকি বিক্রি",
        focus: "focus-visible:ring-rose-500/20 focus-visible:border-rose-500",
        emptyHover: "hover:border-rose-300 dark:hover:border-rose-500/40",
        gradient: "from-rose-500 to-red-600",
        gradientHover: "hover:from-rose-600 hover:to-red-700",
        buttonShadow: "shadow-lg shadow-rose-200 dark:shadow-rose-950/40",
      }
    : {
        border: "border-emerald-100 dark:border-emerald-500/20",
        shadow: "shadow-xl shadow-emerald-100/50 dark:shadow-emerald-950/30",
        label: "text-emerald-500 dark:text-emerald-300",
        pillBg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-500/20",
        pillText: "text-emerald-600 dark:text-emerald-300",
        pillDot: "bg-emerald-500",
        pillLabel: "পরিশোধিত",
        focus: "focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500",
        emptyHover: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
        gradient: "from-emerald-500 to-green-600",
        gradientHover: "hover:from-emerald-600 hover:to-green-700",
        buttonShadow: "shadow-lg shadow-emerald-200 dark:shadow-emerald-950/40",
      };

  return (
    <div
      className={
        className ??
        `w-full min-w-0 overflow-hidden rounded-3xl border-0 ${tone.shadow} bg-emerald-50 dark:bg-emerald-950/30`
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${tone.label}`}>
            লেনদেনের তারিখ
          </p>
          <h2 className={typography("h4", "m-0 leading-tight")}>{formatDate(now, "MMM d, yyyy")}</h2>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${tone.pillBg}`}>
          <span className={`h-2 w-2 rounded-full ${tone.pillDot} animate-pulse`} />
          <span className={`text-xs font-bold uppercase tracking-tight ${tone.pillText}`}>
            {tone.pillLabel}
          </span>
        </div>
      </div>

      {/* Time */}
      <div className="mb-5 flex items-center gap-2 px-5 text-muted-foreground sm:px-6">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-medium tabular-nums">{formatDate(now, "h:mm:ss a")}</span>
      </div>

      {/* Inputs */}
      <div className="space-y-4 px-5 sm:px-6">
        <div>
          <label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
            কাস্টমারের নাম
          </label>
          {isCredit ? (
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
          ) : (
            <Input
              placeholder="খুঁজুন বা কাস্টমার যোগ করুন..."
              value={customer}
              onChange={(e) => {
                const words = e.target.value.split(/\s+/).filter(Boolean);
                if (words.length > 3) {
                  setCustomer(words.slice(0, 3).join(" "));
                } else {
                  setCustomer(e.target.value);
                }
              }}
              className={`h-[46px] rounded-xl bg-white dark:bg-white/10 ${tone.focus}`}
            />
          )}
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8 min-w-0">
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
          <div className="col-span-4">
            <label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">
              পরিমাণ
            </label>
            <QtyStepper
              value={qty}
              onChange={handleQtyChange}
              unit={pickedProduct?.unit}
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
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm">
              <svg className={`h-5 w-5 ${tone.label}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-xs font-medium text-muted-foreground">এখনো কোনো আইটেম যোগ হয়নি</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <Table className="table-global">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[34%] min-w-[130px]">আইটেম</TableHead>
                  <TableHead>পরিমাণ</TableHead>
                  <TableHead>দাম</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.productId}>
                    <TableCell className="w-[34%] min-w-[130px] font-medium">
                      <span className="item-name-cell">{i.name}</span>
                    </TableCell>
                    <TableCell>{i.qty}</TableCell>
                    <TableCell>{currency(i.unitPrice)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(i.productId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
          className={`w-full rounded-2xl bg-gradient-to-r ${tone.gradient} ${tone.gradientHover} ${tone.buttonShadow} py-4 font-bold tracking-wide text-white transition-all active:scale-[0.98]`}
        >
          <Save className="h-4 w-4" />
          {isCredit ? "বাকি বিক্রি সংরক্ষণ" : "নগদ বিক্রি সংরক্ষণ"}
        </Button>
      </div>
    </div>
  );
}

