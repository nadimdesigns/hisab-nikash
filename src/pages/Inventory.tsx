import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import InventoryPanel from "@/components/inventory/InventoryPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShop } from "@/store/shop";
import {
  filterAndSortProducts,
  type ExpiryFilter,
  type SortKey,
  type StockFilter,
} from "@/lib/inventoryFilters";
import { exportInventoryCSV, exportInventoryPDF } from "@/lib/inventoryExport";
import { toast } from "@/hooks/use-toast";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { typography, BODY_TEXT } from "@/lib/typography";
import { cn } from "@/lib/utils";

const STOCK_VALUES: StockFilter[] = ["all", "low", "out", "in"];
const EXPIRY_VALUES: ExpiryFilter[] = ["all", "expired", "3", "7", "30"];
const SORT_VALUES: SortKey[] = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "stock-asc",
  "stock-desc",
  "expiry-asc",
  "newest",
  "oldest",
];

const isString = (v: unknown): v is string => typeof v === "string";
const isStock = (v: unknown): v is StockFilter =>
  typeof v === "string" && (STOCK_VALUES as string[]).includes(v);
const isExpiry = (v: unknown): v is ExpiryFilter =>
  typeof v === "string" && (EXPIRY_VALUES as string[]).includes(v);
const isSort = (v: unknown): v is SortKey =>
  typeof v === "string" && (SORT_VALUES as string[]).includes(v);

export default function Inventory() {
  const [query, setQuery] = usePersistentState<string>("inv.query", "", isString);
  const [category, setCategory] = usePersistentState<string>("inv.category", "all", isString);
  const [stockFilter, setStockFilter] = usePersistentState<StockFilter>("inv.stock", "all", isStock);
  const [expiryFilter, setExpiryFilter] = usePersistentState<ExpiryFilter>("inv.expiry", "all", isExpiry);
  const [sort, setSort] = usePersistentState<SortKey>("inv.sort", "name-asc", isSort);
  const [addOpen, setAddOpen] = useState(false);

  // Auto-open the add-product dialog when arriving via ?new=1 (bottom nav).
  useEffect(() => {
    if (searchParams.get("new") === "1") setAddOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter sheet draft state — changes only commit to the active filters
  // when the user presses "ফিল্টার প্রয়োগ করুন". Drafts are seeded from the
  // current values whenever the sheet opens.
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftStock, setDraftStock] = useState<StockFilter>(stockFilter);
  const [draftExpiry, setDraftExpiry] = useState<ExpiryFilter>(expiryFilter);
  const [draftSort, setDraftSort] = useState<SortKey>(sort);
  const draftAdvancedFilterCount =
    (draftStock !== "all" ? 1 : 0) +
    (draftExpiry !== "all" ? 1 : 0) +
    (draftSort !== "name-asc" ? 1 : 0);
  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setDraftStock(stockFilter);
      setDraftExpiry(expiryFilter);
      setDraftSort(sort);
    }
    setFilterSheetOpen(open);
  };
  const applyDraftFilters = () => {
    setStockFilter(draftStock);
    setExpiryFilter(draftExpiry);
    setSort(draftSort);
    setFilterSheetOpen(false);
  };
  const resetDraftFilters = () => {
    setDraftStock("all");
    setDraftExpiry("all");
    setDraftSort("name-asc");
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const editOnFocus = searchParams.get("edit") === "1";
  const handleFocusHandled = () => {
    if (!searchParams.has("focus") && !searchParams.has("edit")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    next.delete("edit");
    setSearchParams(next, { replace: true });
  };
  const { products } = useShop();

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((m) => {
      const cat = m.category?.trim();
      if (cat) map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return map;
  }, [products]);

  const filtersActive =
    query !== "" ||
    category !== "all" ||
    stockFilter !== "all" ||
    expiryFilter !== "all" ||
    sort !== "name-asc";

  // Number of advanced filters (those exposed in the slide-out panel) that
  // differ from defaults. Used to decorate the filter icon with a counter.
  const advancedFilterCount =
    (stockFilter !== "all" ? 1 : 0) +
    (expiryFilter !== "all" ? 1 : 0) +
    (sort !== "name-asc" ? 1 : 0);

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setStockFilter("all");
    setExpiryFilter("all");
    setSort("name-asc");
  };

  // When the user lands here from the global quick-search with a ?focus=<id>,
  // clear any active filters so the targeted row is guaranteed to be visible
  // before the panel scrolls/highlights it.
  useEffect(() => {
    if (!focusId) return;
    setQuery("");
    setCategory("all");
    setStockFilter("all");
    setExpiryFilter("all");
    // Keep the user's chosen sort.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const filteredForExport = useMemo(
    () =>
      filterAndSortProducts(products, {
        query,
        category,
        stockFilter,
        expiryFilter,
        sort,
      }),
    [products, query, category, stockFilter, expiryFilter, sort],
  );

  const handleExport = async (format: "csv" | "pdf") => {
    if (filteredForExport.length === 0) {
      toast({
        title: "এক্সপোর্ট করার মতো কিছু নেই",
        description: "বর্তমান ফিল্টারের সাথে কোনো পণ্য মেলে না।",
        variant: "destructive",
      });
      return;
    }
    try {
      if (format === "csv") exportInventoryCSV(filteredForExport);
      else await exportInventoryPDF(filteredForExport);
      toast({
        title: `${filteredForExport.length}টি আইটেম এক্সপোর্ট হয়েছে`,
        description: `ইনভেন্টরি রিপোর্ট ${format.toUpperCase()} হিসেবে সংরক্ষিত হয়েছে।`,
      });
    } catch (e) {
      toast({
        title: "এক্সপোর্ট ব্যর্থ হয়েছে",
        description: e instanceof Error ? e.message : "অজানা ত্রুটি",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout title="স্টক">
      <div className="mb-4 space-y-3">
        {/* Top Filter Button */}
        <div className="home-card-appear">
          <Dialog open={filterSheetOpen} onOpenChange={handleSheetOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="relative w-full gap-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 hover:from-emerald-200/70 hover:to-emerald-100/70 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
                aria-label="ফিল্টার খুলুন"
              >
                <span aria-hidden="true" className="text-sm leading-none select-none">⚙️</span>
                <span className="truncate">ফিল্টার</span>
                {advancedFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className={typography("small", "absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center rounded-full px-1 leading-none")}
                  >
                    {advancedFilterCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent
              style={{ fontFamily: "'Anek Bangla', sans-serif" }}
              className="flex max-h-[85svh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 p-0 dark:border-emerald-500/25 dark:from-emerald-950 dark:to-emerald-900 sm:max-w-md"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader className="px-6 pt-6 text-left">
                <DialogTitle>স্টক আইটেম ফিল্টার করুন</DialogTitle>
              </DialogHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6 pt-3">
                <FilterRadioGroup
                  title="স্টক অবস্থা"
                  value={draftStock}
                  onValueChange={(v) => setDraftStock(v as StockFilter)}
                  options={[
                    { value: "all", label: "সব স্টক" },
                    { value: "low", label: "কম স্টক (≤ রিঅর্ডার)" },
                    { value: "out", label: "স্টক শেষ" },
                    { value: "in", label: "স্টকে আছে" },
                  ]}
                />

                <FilterRadioGroup
                  title="মেয়াদ"
                  value={draftExpiry}
                  onValueChange={(v) => setDraftExpiry(v as ExpiryFilter)}
                  options={[
                    { value: "all", label: "যেকোনো মেয়াদ" },
                    { value: "expired", label: "মেয়াদোত্তীর্ণ" },
                    { value: "3", label: "৩ দিনের মধ্যে মেয়াদ শেষ" },
                    { value: "7", label: "৭ দিনের মধ্যে মেয়াদ শেষ" },
                    { value: "30", label: "৩০ দিনের মধ্যে মেয়াদ শেষ" },
                  ]}
                />

                <FilterRadioGroup
                  title="সাজান"
                  value={draftSort}
                  onValueChange={(v) => setDraftSort(v as SortKey)}
                  options={[
                    { value: "name-asc", label: "নাম · A → Z" },
                    { value: "name-desc", label: "নাম · Z → A" },
                    { value: "price-asc", label: "দাম · কম থেকে বেশি" },
                    { value: "price-desc", label: "দাম · বেশি থেকে কম" },
                    { value: "stock-asc", label: "স্টক · কম থেকে বেশি" },
                    { value: "stock-desc", label: "স্টক · বেশি থেকে কম" },
                    { value: "expiry-asc", label: "মেয়াদ · আগে যেটি শেষ হবে" },
                    { value: "newest", label: "নতুন আগে" },
                    { value: "oldest", label: "পুরোনো আগে" },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-2 border-t bg-background px-6 py-4">
                {draftAdvancedFilterCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={resetDraftFilters}
                    className="h-12 w-full gap-2 rounded-xl bg-white hover:bg-white md:h-11"
                  >
                    <span aria-hidden="true" className="text-xs leading-none select-none">✖️</span> ফিল্টার রিসেট করুন
                  </Button>
                )}
                <Button
                  onClick={applyDraftFilters}
                  className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 md:h-11"
                >
                  ফিল্টার প্রয়োগ করুন
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Horizontal Scrolling Pill Tab Bar for Categories */}
        <div
          role="tablist"
          aria-label="ক্যাটাগরি"
          style={{ animationDelay: "60ms" }}
          className="home-card-appear flex items-center gap-1.5 overflow-x-auto rounded-full bg-emerald-100/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:bg-emerald-500/15"
        >
          {[
            { value: "all", label: "সব ক্যাটাগরি", count: products.length },
            ...categories.map((c) => ({ value: c, label: c, count: categoryCounts.get(c) ?? 0 })),
          ].map((opt) => {
            const active = category === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(opt.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                  active
                    ? "bg-emerald-900 text-white"
                    : "text-foreground/75 hover:text-foreground",
                )}
              >
                <span>{opt.label}</span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white/25 px-1 text-[11px] font-bold leading-none tabular-nums">
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <InventoryPanel
        query={query}
        category={category}
        stockFilter={stockFilter}
        expiryFilter={expiryFilter}
        sort={sort}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        focusId={focusId}
        editOnFocus={editOnFocus}
        onFocusHandled={handleFocusHandled}
      />

      <div className="mt-4 space-y-3">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 hover:from-emerald-200/70 hover:to-emerald-100/70 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
              >
                <span aria-hidden="true" className="text-sm leading-none select-none">📥</span> এক্সপোর্ট
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className={BODY_TEXT}>
                এক্সপোর্ট {filteredForExport.length}টি আইটেম
                {filtersActive && (
                  <span className={typography("body-muted", "block font-normal")}>
                    বর্তমান ফিল্টারের ভিত্তিতে
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("csv")} className={cn("gap-2", BODY_TEXT)}>
                <span aria-hidden="true" className="text-sm leading-none select-none">📊</span> CSV ডাউনলোড
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className={cn("gap-2", BODY_TEXT)}>
                <span aria-hidden="true" className="text-sm leading-none select-none">📄</span> PDF ডাউনলোড
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={() => setAddOpen(true)}
          className="home-card-appear h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-bold text-white transition-all hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
        >
          <span aria-hidden="true" className="text-base leading-none select-none">➕</span>
          <span className="truncate">পণ্য যোগ করুন</span>
        </Button>
      </div>
    </AppLayout>
  );
}

/**
 * Vertical radio group used inside the Filters slide-out. Exposes one
 * option per row so users can pick a value with a single tap instead of
 * opening a dropdown.
 */
function FilterRadioGroup({
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
  const groupId = `filter-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-3">
      <p className={cn("font-semibold text-foreground", BODY_TEXT)}>{title}</p>
      <RadioGroup value={value} onValueChange={onValueChange} className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const id = `${groupId}-${opt.value}`;
          return (
            <div
              key={opt.value}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent"
            >
              <RadioGroupItem id={id} value={opt.value} />
              <Label htmlFor={id} className={cn("cursor-pointer font-normal", BODY_TEXT)}>
                {opt.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

