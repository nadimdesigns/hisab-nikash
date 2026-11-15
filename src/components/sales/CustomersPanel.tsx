import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import NewCustomerDialog from "@/components/sales/NewCustomerDialog";
import type { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  Search,
  SlidersHorizontal,
  UserPlus,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { cn } from "@/lib/utils";
import { currency, formatDate, useResponsiveCurrency } from "@/lib/format";
import { typography } from "@/lib/typography";
import { useShop, type SaleItem } from "@/store/shop";
import { loadProfiles } from "@/lib/customerProfiles";
import { dataKey } from "@/lib/demoMode";

type DueEntry = {
  id: string;
  date: string;
  customer: string;
  items: SaleItem[];
  total: number;
};

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
  const [newCustOpen, setNewCustOpen] = useState(false);

  // Auto-open the new-customer dialog when arriving via ?new=1 (bottom nav / homepage).
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") setNewCustOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <>
      <Card className="min-w-0 rounded-3xl border-0 bg-transparent">
        <Sheet open={custFilterSheetOpen} onOpenChange={handleCustSheetOpenChange}>
          <CardHeader className="px-0 pt-5 sm:px-6">
            <div className="flex w-full items-center gap-2">
              {custFiltersActive && (
                <Button variant="ghost" onClick={clearCustFilters} className="h-12 shrink-0 gap-1 rounded-xl md:h-10">
                  <X className="h-3.5 w-3.5" /> মুছুন
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                onClick={() => setNewCustOpen(true)}
                className="h-12 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 md:h-10"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">কাস্টমার যোগ করুন</span>
                <span className="sm:hidden">যোগ করুন</span>
              </Button>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="relative h-12 flex-1 shrink-0 gap-2 rounded-xl border-2 bg-white md:h-10"
                  aria-label="কাস্টমার ফিল্টার খুলুন"
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
          <CardContent className="px-0 sm:px-6">
            <div className="mb-3 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={custQuery}
                onChange={(e) => setCustQuery(e.target.value)}
                placeholder="নাম, নম্বর বা আইডি দিয়ে খুঁজুন"
                className="pl-9 pr-9"
                aria-label="কাস্টমার খুঁজুন"
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
              aria-label="কাস্টমারের মোট"
            >
              <div
                className="min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 py-[16px] pl-[21px] pr-1.5 sm:px-3 sm:py-[7px] dark:from-emerald-500/15 dark:to-emerald-500/5"
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
                className="min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 py-[16px] pl-[21px] pr-1.5 sm:px-3 sm:py-[7px] dark:from-rose-500/15 dark:to-rose-500/5"
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
              style={{ fontFamily: "'Anek Bangla', 'Outfit', system-ui, sans-serif" }}
              className="flex w-full flex-col overflow-hidden p-0 sm:max-w-sm"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <SheetHeader className="px-6 pt-6">
                <SheetTitle>কাস্টমার ফিল্টার</SheetTitle>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6 pt-3">
                <CustFilterRadioGroup
                  title="স্ট্যাটাস"
                  value={draftCustStatus}
                  onValueChange={(v) => setDraftCustStatus(v as typeof custStatus)}
                  options={[
                    { value: "all", label: "সব স্ট্যাটাস" },
                    { value: "due", label: "বাকি আছে" },
                    { value: "cleared", label: "পরিশোধিত" },
                  ]}
                />

                <CustFilterRadioGroup
                  title="বাকির পরিমাণ"
                  value={draftCustDueRange}
                  onValueChange={(v) => setDraftCustDueRange(v as typeof custDueRange)}
                  options={[
                    { value: "any", label: "যেকোনো বাকির পরিমাণ" },
                    { value: "gt0", label: `বাকি > ${currency(0)}` },
                    { value: "gt500", label: `বাকি > ${currency(500)}` },
                    { value: "gt2000", label: `বাকি > ${currency(2000)}` },
                  ]}
                />

                <CustFilterRadioGroup
                  title="সাজান"
                  value={draftCustSort}
                  onValueChange={(v) => setDraftCustSort(v as CustSortKey)}
                  options={[
                    { value: "billed-desc", label: "মোট বিল · বেশি থেকে কম" },
                    { value: "billed-asc", label: "মোট বিল · কম থেকে বেশি" },
                    { value: "due-desc", label: "বাকি · বেশি থেকে কম" },
                    { value: "due-asc", label: "বাকি · কম থেকে বেশি" },
                    { value: "name-asc", label: "নাম · A → Z" },
                    { value: "name-desc", label: "নাম · Z → A" },
                    { value: "purchases-desc", label: "সবচেয়ে বেশি কেনাকাটা" },
                    { value: "recent", label: "সবচেয়ে সাম্প্রতিক কার্যকলাপ" },
                  ]}
                />

                <div className="space-y-3">
                  <p className="font-semibold text-foreground">লেনদেনের তারিখের সীমা</p>
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
                            variant="outline"
                            size="sm"
                            onClick={() => setDraftCustDateRange(undefined)}
                            className="gap-1 rounded-md bg-white hover:bg-white"
                          >
                            <X className="h-3.5 w-3.5" /> তারিখ মুছুন
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t bg-background px-6 py-4">
                {draftCustAdvancedFilterCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={resetCustDraftFilters}
                    className="h-12 w-full gap-2 rounded-xl bg-white hover:bg-white md:h-11"
                  >
                    <X className="h-4 w-4" /> ফিল্টার রিসেট করুন
                  </Button>
                )}
                <Button
                  onClick={applyCustDraftFilters}
                  className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 md:h-11"
                >
                  ফিল্টার প্রয়োগ করুন
                </Button>
              </div>
            </SheetContent>

            <p className={typography("body-muted", "mb-2")}>
              {filteredCustomers.length} এর মধ্যে {customers.length} জন কাস্টমার দেখানো হচ্ছে
            </p>

            {filteredCustomers.length === 0 ? (
              <div className={typography("body-muted", "rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 py-10 text-center dark:from-emerald-500/15 dark:to-emerald-500/5")}>
                {customers.length === 0
                  ? "এখনো কোনো কাস্টমার নেই।"
                  : "কোনো কাস্টমার ফিল্টারের সাথে মিলছে না।"}
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredCustomers.map((c) => (
                  <li key={c.name}>
                    <Link
                      to={`/customers/${encodeURIComponent(c.name)}`}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border-0 p-3 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.99] sm:p-4",
                        c.due > 0
                          ? "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-500/15 dark:to-sky-500/5"
                          : "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{c.name}</span>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {fmtMoney(c.totalBilled)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">
                            {c.purchases + c.dueEntries}টি লেনদেন ·{" "}
                            {c.lastPurchase
                              ? formatDate(c.lastPurchase, "MMM d, yyyy")
                              : "কোনো কার্যকলাপ নেই"}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums">
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

      <NewCustomerDialog open={newCustOpen} onOpenChange={setNewCustOpen} />
      </Card>
    </>
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
