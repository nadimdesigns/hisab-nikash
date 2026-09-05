import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import InventoryPanel from "@/components/inventory/InventoryPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Search, Download, FileText, FileSpreadsheet, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
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
  const handleFocusHandled = () => {
    if (!searchParams.has("focus")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
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
        <div className="flex items-center gap-2">
          <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-between gap-2 sm:w-48 sm:flex-none"
                aria-label="ক্যাটাগরি নির্বাচন করুন"
              >
                <span className="truncate">
                  {category === "all" ? "সব ক্যাটাগরি" : category}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
            >
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>ক্যাটাগরি</SheetTitle>
              </SheetHeader>
              <ul className="flex-1 overflow-y-auto py-2">
                {[
                  { value: "all", label: "সব ক্যাটাগরি" },
                  ...categories.map((c) => ({ value: c, label: c })),
                ].map((opt) => {
                  const active = category === opt.value;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(opt.value);
                          setCategorySheetOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-6 py-3 text-left transition-colors hover:bg-accent",
                          active && "bg-accent",
                        )}
                        aria-pressed={active}
                      >
                        <span className="truncate">{opt.label}</span>
                        {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>

          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="hidden shrink-0 gap-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 sm:ml-auto sm:inline-flex"
          >
            <Plus className="h-4 w-4" /> পণ্য যোগ করুন
          </Button>

          <Sheet open={filterSheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="relative flex-1 gap-2 px-[26px] sm:flex-none sm:shrink-0"
                aria-label="ফিল্টার খুলুন"
              >
                <SlidersHorizontal className="h-4 w-4" />
                ফিল্টার
                {advancedFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className={typography("small", "absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center rounded-full px-1 leading-none")}
                  >
                    {advancedFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              style={{ fontFamily: "'Anek Bangla', 'Outfit', system-ui, sans-serif" }}
              className="flex w-full flex-col overflow-hidden p-0 sm:max-w-sm"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <SheetHeader className="px-6 pt-6">
                <SheetTitle>স্টক আইটেম ফিল্টার করুন</SheetTitle>
                <div className="relative mt-3">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="পণ্য খুঁজুন"
                    className={cn("bg-white dark:bg-background", query ? "pr-[6.5rem]" : "pr-[4.5rem]")}
                    aria-label="পণ্য খুঁজুন"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-[4.25rem] top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                      aria-label="খোঁজ মুছুন"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFilterSheetOpen(false)}
                    className="absolute right-1 top-1/2 h-10 -translate-y-1/2 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 px-3 text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 md:h-8"
                  >
                    <Search className="h-4 w-4" />
                    খুঁজুন
                  </Button>
                </div>
              </SheetHeader>

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
                    <X className="h-4 w-4" /> ফিল্টার রিসেট করুন
                  </Button>
                )}
                <Button
                  onClick={applyDraftFilters}
                  className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 md:h-11"
                >
                  ফিল্টার প্রয়োগ করুন
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className={cn("gap-1", BODY_TEXT)}>
              <X className="h-3.5 w-3.5" /> মুছুন
            </Button>
          )}
        </div>

        <Button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 sm:hidden"
        >
          <Plus className="h-4 w-4" /> পণ্য যোগ করুন
        </Button>
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
        onFocusHandled={handleFocusHandled}
      />

      <div className="mt-4 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> এক্সপোর্ট
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
              <FileSpreadsheet className="h-4 w-4" /> CSV ডাউনলোড
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")} className={cn("gap-2", BODY_TEXT)}>
              <FileText className="h-4 w-4" /> PDF ডাউনলোড
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

