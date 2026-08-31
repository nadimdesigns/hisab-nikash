import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  Download,
  ListFilter,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UserCircle2,
  Wallet,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { currency, formatDate, useResponsiveCurrency } from "@/lib/format";
import { typography } from "@/lib/typography";
import { useShop, type SaleItem } from "@/store/shop";
import { loadProfiles } from "@/lib/customerProfiles";

// Local copy of the DueEntry shape + storage key used by Sales.tsx so this
// panel can read/write outstanding dues independently.
type DueEntry = {
  id: string;
  date: string;
  customer: string;
  items: SaleItem[];
  total: number;
};

import { dataKey, isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";
const DUES_KEY = dataKey("medishop-dues-v1");

const loadDues = (): DueEntry[] => {
  try {
    const raw = localStorage.getItem(DUES_KEY);
    return raw ? (JSON.parse(raw) as DueEntry[]) : [];
  } catch {
    return [];
  }
};

type CustomerRow = {
  name: string;
  purchases: number;
  cashBilled: number;
  dueEntries: number;
  dueBilled: number;
  totalBilled: number;
  paid: number;
  due: number;
  lastPurchase: string | null;
};

type CustSortKey =
  | "name-asc"
  | "name-desc"
  | "due-desc"
  | "due-asc"
  | "billed-desc"
  | "billed-asc"
  | "purchases-desc"
  | "recent";

export default function CustomersPanel() {
  const { sales } = useShop();
  const fmtMoney = useResponsiveCurrency();

  // Self-managed dues — kept in sync across tabs/components via storage events.
  const [dues, setDues] = useState<DueEntry[]>(() => loadDues());
  const [profileNames, setProfileNames] = useState<string[]>(() => Object.keys(loadProfiles()));
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === DUES_KEY) setDues(loadDues());
      if (e.key && e.key.includes("medishop-customer-profiles")) {
        setProfileNames(Object.keys(loadProfiles()));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  // Refresh profile-registered customers whenever this panel remounts / becomes visible.
  useEffect(() => {
    const refresh = () => setProfileNames(Object.keys(loadProfiles()));
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const recordCustomerPayment = (customerName: string, amount: number) => {
    if (isReadOnly()) {
      notifyReadOnlyBlocked();
      return 0;
    }
    let remaining = amount;
    const target = customerName || "Walk-in";
    const next = dues
      .map((d) => {
        if ((d.customer || "Walk-in") !== target || remaining <= 0) return d;
        if (d.total <= remaining) {
          remaining -= d.total;
          return null;
        }
        const updated = { ...d, total: d.total - remaining };
        remaining = 0;
        return updated;
      })
      .filter(Boolean) as DueEntry[];
    setDues(next);
    try {
      localStorage.setItem(DUES_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
    return amount - remaining;
  };

  // ===== Aggregation =====
  const customers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>();
    const blank = (name: string): CustomerRow => ({
      name,
      purchases: 0,
      cashBilled: 0,
      dueEntries: 0,
      dueBilled: 0,
      totalBilled: 0,
      paid: 0,
      due: 0,
      lastPurchase: null,
    });
    sales.forEach((s) => {
      const key = s.customer || "Walk-in";
      const cur = map.get(key) ?? blank(key);
      // Resolve actual amounts paid vs outstanding for this sale.
      // Defaults: cash sales fully paid, credit sales unpaid (matches store).
      const paidForSale =
        s.amountPaid ?? ((s.saleType ?? "cash") === "credit" ? 0 : s.total);
      const clampedPaid = Math.max(0, Math.min(paidForSale, s.total));
      const outstanding = s.total - clampedPaid;
      cur.purchases += 1;
      cur.cashBilled += s.total;
      cur.totalBilled += s.total;
      cur.paid += clampedPaid;
      if (outstanding > 0) {
        cur.due += outstanding;
      }
      if (!cur.lastPurchase || new Date(s.date) > new Date(cur.lastPurchase)) {
        cur.lastPurchase = s.date;
      }
      map.set(key, cur);
    });
    dues.forEach((d) => {
      const key = d.customer || "Walk-in";
      const cur = map.get(key) ?? blank(key);
      cur.dueEntries += 1;
      cur.dueBilled += d.total;
      cur.totalBilled += d.total;
      cur.due += d.total;
      if (!cur.lastPurchase || new Date(d.date) > new Date(cur.lastPurchase)) {
        cur.lastPurchase = d.date;
      }
      map.set(key, cur);
    });
    // Include customers registered via the "Add Customer" flow even if they
    // have no transactions yet — otherwise adding a customer looks like a no-op.
    profileNames.forEach((name) => {
      const key = name.trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, blank(key));
    });
    return Array.from(map.values()).sort((a, b) => b.totalBilled - a.totalBilled);
  }, [sales, dues, profileNames]);

  // ===== Filters =====
  const [custQuery, setCustQuery] = useState("");
  const [custStatus, setCustStatus] = useState<"all" | "due" | "cleared">("all");
  const [custDueRange, setCustDueRange] = useState<"any" | "gt0" | "gt500" | "gt2000">("any");
  const [custSort, setCustSort] = useState<CustSortKey>("billed-desc");
  const [custDateRange, setCustDateRange] = useState<DateRange | undefined>(undefined);

  const customerActivity = useMemo(() => {
    const map = new Map<string, number[]>();
    const push = (name: string, iso: string) => {
      const key = name || "Walk-in";
      const arr = map.get(key) ?? [];
      arr.push(new Date(iso).getTime());
      map.set(key, arr);
    };
    sales.forEach((s) => push(s.customer, s.date));
    dues.forEach((d) => push(d.customer, d.date));
    return map;
  }, [sales, dues]);

  const filteredCustomers = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    const fromTs = custDateRange?.from ? new Date(custDateRange.from).setHours(0, 0, 0, 0) : null;
    const toSrc = custDateRange?.to ?? custDateRange?.from;
    const toTs = toSrc ? new Date(toSrc).setHours(23, 59, 59, 999) : null;

    const list = customers.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (custStatus === "due" && c.due <= 0) return false;
      if (custStatus === "cleared" && c.due > 0) return false;
      if (custDueRange === "gt0" && c.due <= 0) return false;
      if (custDueRange === "gt500" && c.due <= 500) return false;
      if (custDueRange === "gt2000" && c.due <= 2000) return false;
      if (fromTs !== null && toTs !== null) {
        const times = customerActivity.get(c.name) ?? [];
        const hasActivity = times.some((t) => t >= fromTs && t <= toTs);
        if (!hasActivity) return false;
      }
      return true;
    });

    const byName = (a: CustomerRow, b: CustomerRow) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    const sorted = [...list];
    switch (custSort) {
      case "name-asc":
        sorted.sort(byName);
        break;
      case "name-desc":
        sorted.sort((a, b) => -byName(a, b));
        break;
      case "due-desc":
        sorted.sort((a, b) => b.due - a.due || byName(a, b));
        break;
      case "due-asc":
        sorted.sort((a, b) => a.due - b.due || byName(a, b));
        break;
      case "billed-asc":
        sorted.sort((a, b) => a.totalBilled - b.totalBilled || byName(a, b));
        break;
      case "purchases-desc":
        sorted.sort(
          (a, b) => b.purchases + b.dueEntries - (a.purchases + a.dueEntries) || byName(a, b),
        );
        break;
      case "recent":
        sorted.sort((a, b) => {
          const at = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0;
          const bt = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0;
          return bt - at || byName(a, b);
        });
        break;
      case "billed-desc":
      default:
        sorted.sort((a, b) => b.totalBilled - a.totalBilled || byName(a, b));
        break;
    }
    return sorted;
  }, [customers, customerActivity, custQuery, custStatus, custDueRange, custSort, custDateRange]);

  const clearCustFilters = () => {
    setCustQuery("");
    setCustStatus("all");
    setCustDueRange("any");
    setCustSort("billed-desc");
    setCustDateRange(undefined);
  };
  const custFiltersActive =
    custQuery !== "" ||
    custStatus !== "all" ||
    custDueRange !== "any" ||
    custSort !== "billed-desc" ||
    !!custDateRange?.from;
  const custAdvancedFilterCount =
    (custStatus !== "all" ? 1 : 0) +
    (custDueRange !== "any" ? 1 : 0) +
    (custSort !== "billed-desc" ? 1 : 0) +
    (custDateRange?.from ? 1 : 0);

  // ===== Customer selection filter sheet =====
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);
  const [customerFilterQuery, setCustomerFilterQuery] = useState("");
  const selectedCustomerName = custQuery; // "" means All

  // ===== Filter sheet (draft state — commits on Apply) =====
  const [custFilterSheetOpen, setCustFilterSheetOpen] = useState(false);
  const [draftCustStatus, setDraftCustStatus] = useState<typeof custStatus>(custStatus);
  const [draftCustDueRange, setDraftCustDueRange] = useState<typeof custDueRange>(custDueRange);
  const [draftCustSort, setDraftCustSort] = useState<CustSortKey>(custSort);
  const [draftCustDateRange, setDraftCustDateRange] = useState<DateRange | undefined>(custDateRange);
  const draftCustAdvancedFilterCount =
    (draftCustStatus !== "all" ? 1 : 0) +
    (draftCustDueRange !== "any" ? 1 : 0) +
    (draftCustSort !== "billed-desc" ? 1 : 0) +
    (draftCustDateRange?.from ? 1 : 0);
  const handleCustSheetOpenChange = (open: boolean) => {
    if (open) {
      setDraftCustStatus(custStatus);
      setDraftCustDueRange(custDueRange);
      setDraftCustSort(custSort);
      setDraftCustDateRange(custDateRange);
    }
    setCustFilterSheetOpen(open);
  };
  const applyCustDraftFilters = () => {
    setCustStatus(draftCustStatus);
    setCustDueRange(draftCustDueRange);
    setCustSort(draftCustSort);
    setCustDateRange(draftCustDateRange);
    setCustFilterSheetOpen(false);
  };
  const resetCustDraftFilters = () => {
    setDraftCustStatus("all");
    setDraftCustDueRange("any");
    setDraftCustSort("billed-desc");
    setDraftCustDateRange(undefined);
  };

  // ===== Customer details drawer =====
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [paymentInput, setPaymentInput] = useState("");
  useEffect(() => {
    if (!selectedCustomer) setPaymentInput("");
  }, [selectedCustomer]);
  const selectedRow = useMemo(
    () => customers.find((c) => c.name === selectedCustomer) ?? null,
    [customers, selectedCustomer],
  );
  type HistoryEntry = {
    id: string;
    date: string;
    kind: "cash" | "due";
    items: SaleItem[];
    total: number;
  };
  const selectedHistory = useMemo<HistoryEntry[]>(() => {
    if (!selectedCustomer) return [];
    const cashEntries: HistoryEntry[] = sales
      .filter((s) => (s.customer || "Walk-in") === selectedCustomer)
      .map((s) => ({ id: s.id, date: s.date, kind: "cash", items: s.items, total: s.total }));
    const dueEntries: HistoryEntry[] = dues
      .filter((d) => (d.customer || "Walk-in") === selectedCustomer)
      .map((d) => ({ id: d.id, date: d.date, kind: "due", items: d.items, total: d.total }));
    return [...cashEntries, ...dueEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [selectedCustomer, sales, dues]);

  const exportCustomerCSV = () => {
    if (!selectedRow) return;
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      "Date",
      "Type",
      "Transaction ID",
      "Item",
      "Product ID",
      "Quantity",
      "Unit Price",
      "Line Total",
      "Transaction Total",
    ];
    const rows: string[][] = [];
    selectedHistory.forEach((h) => {
      const dateStr = format(new Date(h.date), "yyyy-MM-dd HH:mm");
      const typeLabel = h.kind === "due" ? "Due" : "Cash";
      h.items.forEach((it) => {
        rows.push([
          dateStr,
          typeLabel,
          h.id,
          it.name,
          it.productId,
          String(it.qty),
          it.unitPrice.toFixed(2),
          (it.qty * it.unitPrice).toFixed(2),
          h.total.toFixed(2),
        ]);
      });
    });
    rows.push([]);
    rows.push(["সারাংশ"]);
    rows.push(["খদ্দের", selectedRow.name]);
    rows.push(["মোট বিল", selectedRow.totalBilled.toFixed(2)]);
    rows.push(["নগদ বিল", selectedRow.cashBilled.toFixed(2)]);
    rows.push(["বাকি বিল", selectedRow.dueBilled.toFixed(2)]);
    rows.push(["পরিশোধিত", selectedRow.paid.toFixed(2)]);
    rows.push(["অপরিশোধিত বাকি", selectedRow.due.toFixed(2)]);

    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safeName = selectedRow.name.replace(/[^a-z0-9-_]+/gi, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `HisabNikash_${safeName}_transactions_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "CSV এক্সপোর্ট হয়েছে", description: `${selectedRow.name} এর লেনদেন ডাউনলোড হয়েছে।` });
  };

  return (
    <>
      <Card className="form-surface shadow-soft min-w-0 rounded-3xl border-0">
        <Sheet open={custFilterSheetOpen} onOpenChange={handleCustSheetOpenChange}>
          <CardHeader className="px-4 pt-5 sm:px-6">
            <div className="flex w-full items-center gap-2">
              {custFiltersActive && (
                <Button variant="ghost" size="sm" onClick={clearCustFilters} className="shrink-0 gap-1">
                  <X className="h-3.5 w-3.5" /> মুছুন
                </Button>
              )}
              <Button
                asChild
                variant="default"
                size="sm"
                className="flex-1 gap-1.5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-400 text-white shadow-md shadow-emerald-600/25 hover:from-emerald-600 hover:via-emerald-500 hover:to-lime-300"
              >
                <Link to="/new-customer">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">খদ্দের যোগ করুন</span>
                  <span className="sm:hidden">যোগ করুন</span>
                </Link>
              </Button>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative flex-1 shrink-0 gap-2 border-2 bg-white"
                  aria-label="খদ্দের ফিল্টার খুলুন"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  ফিল্টার
                  {custAdvancedFilterCount > 0 && (
                    <Badge
                      variant="default"
                      className={typography(
                        "small",
                        "absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center rounded-full px-1 leading-none text-primary-foreground",
                      )}
                    >
                      {custAdvancedFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="mb-3 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={custQuery}
                onChange={(e) => setCustQuery(e.target.value)}
                placeholder="নাম, নম্বর বা আইডি দিয়ে খুঁজুন"
                className="pl-9 pr-9"
                aria-label="খদ্দের খুঁজুন"
              />
              {custQuery && (
                <button
                  type="button"
                  onClick={() => setCustQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div
              className="mb-4 grid w-full grid-cols-2 gap-1.5 overflow-hidden sm:gap-3"
              role="group"
              aria-label="খদ্দেরের মোট"
            >
              <div
                className="min-w-0 overflow-hidden rounded-2xl bg-white py-[16px] pl-[21px] pr-1.5 shadow-sm sm:px-3 sm:py-[7px] dark:bg-white/10"
                role="group"
                aria-label={`মোট বিল: ${currency(customers.reduce((s, c) => s + c.totalBilled, 0))}`}
              >
                <p aria-hidden="true" className={typography("body-muted", "truncate leading-tight")}>
                  মোট বিল
                </p>
                <p aria-hidden="true" className={typography("h4", "mt-0.5 truncate tabular-nums sm:mt-1")}>
                  {fmtMoney(customers.reduce((s, c) => s + c.totalBilled, 0))}
                </p>
              </div>
              <div
                className="min-w-0 overflow-hidden rounded-2xl bg-white py-[16px] pl-[21px] pr-1.5 shadow-sm sm:px-3 sm:py-[7px] dark:bg-white/10"
                role="group"
                aria-label={`মোট বাকি: ${currency(customers.reduce((s, c) => s + c.due, 0))}`}
              >
                <p aria-hidden="true" className={typography("body-muted", "truncate leading-tight")}>
                  মোট বাকি
                </p>
                <p
                  aria-hidden="true"
                  className={typography("h4", "mt-0.5 truncate tabular-nums text-destructive sm:mt-1")}
                >
                  {fmtMoney(customers.reduce((s, c) => s + c.due, 0))}
                </p>
              </div>
            </div>

            <SheetContent
              side="right"
              className="flex w-full flex-col overflow-hidden p-0 sm:max-w-sm"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <SheetHeader className="px-6 pt-6">
                <SheetTitle>খদ্দের ফিল্টার</SheetTitle>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6 pt-3">
                <CustFilterRadioGroup
                  title="Status"
                  value={draftCustStatus}
                  onValueChange={(v) => setDraftCustStatus(v as typeof custStatus)}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "due", label: "Has due" },
                    { value: "cleared", label: "Cleared" },
                  ]}
                />

                <CustFilterRadioGroup
                  title="Due amount"
                  value={draftCustDueRange}
                  onValueChange={(v) => setDraftCustDueRange(v as typeof custDueRange)}
                  options={[
                    { value: "any", label: "Any due amount" },
                    { value: "gt0", label: `Due > ${currency(0)}` },
                    { value: "gt500", label: `Due > ${currency(500)}` },
                    { value: "gt2000", label: `Due > ${currency(2000)}` },
                  ]}
                />

                <CustFilterRadioGroup
                  title="Sort by"
                  value={draftCustSort}
                  onValueChange={(v) => setDraftCustSort(v as CustSortKey)}
                  options={[
                    { value: "billed-desc", label: "Total Billed · High to Low" },
                    { value: "billed-asc", label: "Total Billed · Low to High" },
                    { value: "due-desc", label: "Due · High to Low" },
                    { value: "due-asc", label: "Due · Low to High" },
                    { value: "name-asc", label: "Name · A → Z" },
                    { value: "name-desc", label: "Name · Z → A" },
                    { value: "purchases-desc", label: "Most purchases" },
                    { value: "recent", label: "Most recent activity" },
                  ]}
                />

                <div className="space-y-3">
                  <p className="font-semibold text-foreground">Activity date range</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start gap-2 text-left font-normal",
                          !draftCustDateRange?.from && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0" />
                        {draftCustDateRange?.from ? (
                          draftCustDateRange.to ? (
                            <span className="truncate">
                              {formatDate(draftCustDateRange.from, "LLL d, y")} –{" "}
                              {formatDate(draftCustDateRange.to, "LLL d, y")}
                            </span>
                          ) : (
                            <span className="truncate">
                              {formatDate(draftCustDateRange.from, "LLL d, y")}
                            </span>
                          )
                        ) : (
                          <span>তারিখের পরিসর বাছাই করুন</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={draftCustDateRange}
                        onSelect={setDraftCustDateRange}
                        numberOfMonths={1}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                      {draftCustDateRange?.from && (
                        <div className="flex items-center justify-end border-t p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDraftCustDateRange(undefined)}
                            className="gap-1"
                          >
                            <X className="h-3.5 w-3.5" /> Clear dates
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t bg-background px-6 py-4">
                {draftCustAdvancedFilterCount > 0 && (
                  <Button variant="ghost" onClick={resetCustDraftFilters} className="w-full gap-2">
                    <X className="h-4 w-4" /> Reset filters
                  </Button>
                )}
                <Button onClick={applyCustDraftFilters} className="w-full">
                  ফিল্টার প্রয়োগ করুন
                </Button>
              </div>
            </SheetContent>

            <p className={typography("body-muted", "mb-2")}>
              {filteredCustomers.length} এর মধ্যে {customers.length} জন খদ্দের দেখানো হচ্ছে
            </p>

            {filteredCustomers.length === 0 ? (
              <div className={typography("body-muted", "rounded-lg border py-10 text-center")}>
                {customers.length === 0
                  ? "এখনো কোনো খদ্দের নেই।"
                  : "কোনো খদ্দের ফিল্টারের সাথে মিলছে না।"}
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {filteredCustomers.map((c) => (
                  <li key={c.name}>
                    <Link
                      to={`/customers/${encodeURIComponent(c.name)}`}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:px-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={typography("body-strong", "truncate")}>{c.name}</span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {fmtMoney(c.totalBilled)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={typography("body-muted", "truncate")}>
                            {c.purchases + c.dueEntries}টি লেনদেন ·{" "}
                            {c.lastPurchase
                              ? formatDate(c.lastPurchase, "MMM d, yyyy")
                              : "কোনো কার্যকলাপ নেই"}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {c.due > 0 ? (
                              <span className="font-medium text-destructive">
                                বাকি {fmtMoney(c.due)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">পরিশোধিত</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Sheet>
      </Card>

      <Sheet open={!!selectedCustomer} onOpenChange={(v) => !v && setSelectedCustomer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <SheetTitle className="flex items-center gap-2">
                  <UserCircle2 className="h-5 w-5 text-primary" />
                  <span className="truncate">{selectedRow?.name ?? "Customer"}</span>
                </SheetTitle>
                <SheetDescription>
                  {selectedRow
                    ? `${selectedRow.purchases + selectedRow.dueEntries} total transaction${
                        selectedRow.purchases + selectedRow.dueEntries === 1 ? "" : "s"
                      } · Last purchase ${
                        selectedRow.lastPurchase
                          ? formatDate(selectedRow.lastPurchase, "MMM d, yyyy")
                          : "—"
                      }`
                    : ""}
                </SheetDescription>
              </div>
              {selectedRow && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={exportCustomerCSV}
                  disabled={selectedHistory.length === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              )}
            </div>
          </SheetHeader>

          {selectedRow && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <SummaryTile
                  icon={<ShoppingBag className="h-4 w-4" />}
                  label="Total billed"
                  value={currency(selectedRow.totalBilled)}
                />
                <SummaryTile
                  icon={<Wallet className="h-4 w-4" />}
                  label="Paid"
                  value={currency(selectedRow.paid)}
                  tone="success"
                />
                <SummaryTile
                  icon={<AlertCircle className="h-4 w-4" />}
                  label="Due"
                  value={currency(selectedRow.due)}
                  tone={selectedRow.due > 0 ? "destructive" : "muted"}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border bg-muted/30 p-2.5">
                  <p className={typography("body-muted")}>Cash sales</p>
                  <p className={typography("body", "mt-0.5 font-semibold")}>
                    {selectedRow.purchases} · {currency(selectedRow.cashBilled)}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-2.5">
                  <p className={typography("body-muted")}>Due entries</p>
                  <p className={typography("body", "mt-0.5 font-semibold")}>
                    {selectedRow.dueEntries} · {currency(selectedRow.dueBilled)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className={typography("body", "font-semibold")}>Record payment</h3>
                  <span className={typography("body-muted")}>
                    Outstanding:{" "}
                    <span className="font-medium text-foreground">{currency(selectedRow.due)}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="টাকার পরিমাণ"
                    value={paymentInput}
                    onChange={(e) => setPaymentInput(e.target.value)}
                    disabled={selectedRow.due <= 0}
                    className="sm:flex-1"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentInput(String(selectedRow.due))}
                      disabled={selectedRow.due <= 0}
                    >
                      Full
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1"
                      disabled={selectedRow.due <= 0}
                      onClick={() => {
                        const amount = parseFloat(paymentInput);
                        if (!Number.isFinite(amount) || amount <= 0) {
                          toast({ title: "Enter a valid amount", variant: "destructive" });
                          return;
                        }
                        if (amount > selectedRow.due + 0.005) {
                          toast({
                            title: "Amount exceeds due",
                            description: `${selectedRow.name} owes ${currency(selectedRow.due)}.`,
                            variant: "destructive",
                          });
                          return;
                        }
                        const applied = recordCustomerPayment(selectedRow.name, amount);
                        setPaymentInput("");
                        toast({
                          title: "Payment recorded",
                          description: `${currency(applied)} applied to ${selectedRow.name}.`,
                        });
                      }}
                    >
                      <Wallet className="h-3.5 w-3.5" /> Pay
                    </Button>
                  </div>
                </div>
                {selectedRow.due <= 0 && (
                  <p className={typography("body-muted", "mt-2")}>No outstanding balance.</p>
                )}
              </div>

              <div>
                <h3 className={typography("body", "mb-2 font-semibold")}>Transaction history</h3>
                <ScrollArea className="h-[calc(100vh-32rem)] min-h-[12rem] rounded-md border">
                  {selectedHistory.length === 0 ? (
                    <p className={typography("body-muted", "p-6 text-center")}>
                      No transactions yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {selectedHistory.map((h) => (
                        <li key={`${h.kind}-${h.id}`} className="p-3">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={h.kind === "due" ? "destructive" : "secondary"}>
                                {h.kind === "due" ? "Due" : "Cash"}
                              </Badge>
                              <span className={typography("body-muted")}>
                                {formatDate(h.date, "MMM d, yyyy · HH:mm")}
                              </span>
                            </div>
                            <span className={typography("body", "font-semibold")}>
                              {currency(h.total)}
                            </span>
                          </div>
                          <ul className="space-y-0.5 pl-1">
                            {h.items.map((it) => (
                              <li
                                key={it.productId}
                                className={typography(
                                  "body-muted",
                                  "flex items-center justify-between gap-2",
                                )}
                              >
                                <span className="truncate">
                                  {it.name} <span className="text-foreground/70">× {it.qty}</span>
                                </span>
                                <span>{currency(it.qty * it.unitPrice)}</span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive" | "muted";
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="min-w-0 rounded-md border bg-card p-2.5">
      <div className={typography("muted", "flex items-center gap-1.5 uppercase tracking-wide")}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className={typography("body", `mt-1 truncate font-semibold ${valueClass}`)}>{value}</p>
    </div>
  );
}

function CustFilterRadioGroup({
  title,
  value,
  onValueChange,
  options,
}: {
  title: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const groupId = `cust-filter-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-3">
      <p className="font-semibold text-foreground">{title}</p>
      <RadioGroup value={value} onValueChange={onValueChange} className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const id = `${groupId}-${opt.value}`;
          return (
            <div
              key={opt.value}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent"
            >
              <RadioGroupItem id={id} value={opt.value} />
              <Label htmlFor={id} className="cursor-pointer font-normal">
                {opt.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
