import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { Search, ShoppingBasket, UserRound, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product, useShop } from "@/store/shop";
import { bnNumber, currency, daysUntil } from "@/lib/format";
import { typography, BODY_TEXT } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { loadDrafts, saveDraft } from "@/lib/drafts";
import { loadProfiles } from "@/lib/customerProfiles";

const OPEN_EVENT = "medishop-open-quick-search";
const ANEK_FONT = { fontFamily: "'Anek Bangla', 'Outfit', system-ui, sans-serif" };

/** Programmatically open the global product/customer quick-search dialog. */
export function openProductQuickSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type QuickCustomer = { name: string; tx: number };

export function ProductQuickSearch() {
  const { products, sales } = useShop();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Listen for global open requests + Cmd/Ctrl+K shortcut.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Reset the query each time the dialog opens for a clean start.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Build a Fuse index whenever the catalog changes. Weighted keys put the
  // product name first, then aliases/ingredients, with SKU/batch/barcode
  // available as exact-ish matches. `threshold` of 0.38 is forgiving enough
  // for typos and partial matches without producing noise.
  const fuse = useMemo(
    () =>
      new Fuse<Product>(products, {
        includeScore: true,
        ignoreLocation: true,
        threshold: 0.38,
        minMatchCharLength: 2,
        keys: [
          { name: "name", weight: 0.5 },
          { name: "aliases", weight: 0.3 },
          { name: "category", weight: 0.1 },
          { name: "sku", weight: 0.05 },
          { name: "batch", weight: 0.025 },
          { name: "barcode", weight: 0.025 },
        ],
      }),
    [products],
  );

  const q = query.trim();

  const productResults = useMemo(() => {
    if (!q) return products.slice(0, 60);
    return fuse.search(q).slice(0, 60).map((r) => r.item);
  }, [fuse, products, q]);

  // Customer index built from sales history + registered profiles. Only
  // refreshed while the dialog is open, so typing stays cheap.
  const customerResults = useMemo<QuickCustomer[]>(() => {
    if (!q) return [];
    const map = new Map<string, QuickCustomer>();
    sales.forEach((s) => {
      const key = s.customer || "Walk-in";
      if (key === "Walk-in") return;
      const cur = map.get(key) ?? { name: key, tx: 0 };
      cur.tx += 1;
      map.set(key, cur);
    });
    Object.keys(loadProfiles()).forEach((name) => {
      const key = name.trim();
      if (!key || key === "Walk-in") return;
      if (!map.has(key)) map.set(key, { name: key, tx: 0 });
    });
    const needle = q.toLowerCase();
    return Array.from(map.values())
      .filter((c) => c.name.toLowerCase().includes(needle))
      .sort((a, b) => b.tx - a.tx)
      .slice(0, 30);
  }, [q, sales]);

  const pickProduct = (id: string) => {
    setOpen(false);
    navigate(`/stocks?focus=${encodeURIComponent(id)}`);
  };

  const pickCustomer = (name: string) => {
    setOpen(false);
    navigate(`/customers/${encodeURIComponent(name)}`);
  };

  // Quick add-to-sale: append the product to the persistent "cash" draft
  // cart (or bump qty if already present) and jump to the Sales page so the
  // user can finalize the transaction. Mirrors the addItem logic in Sales.
  const addToSale = (m: Product) => {
    const drafts = loadDrafts();
    const current = drafts.cash;
    const existing = current?.items.find((i) => i.productId === m.id);
    const items = existing
      ? (current?.items ?? []).map((i) =>
          i.productId === m.id ? { ...i, qty: i.qty + 1 } : i,
        )
      : [
          ...(current?.items ?? []),
          {
            productId: m.id,
            name: m.name,
            qty: 1,
            unitPrice: m.sellPrice,
            unitCost: m.costPrice,
          },
        ];
    saveDraft("cash", { customer: current?.customer ?? "", items });
    setOpen(false);
    toast.success(`${m.name} বিক্রিতে যোগ হয়েছে`);
    navigate("/new-sale");
  };

  // Barcode / UPN auto-jump: when the typed (or scanned/pasted) value is an
  // exact match for a stored barcode, immediately navigate to that product.
  // Most USB barcode scanners "type" the code very quickly and append Enter,
  // so the exact-match check fires the instant the full code lands.
  useEffect(() => {
    if (q.length < 4) return;
    const exact = products.find(
      (m) => (m.barcode ?? "").trim().toLowerCase() === q.toLowerCase(),
    );
    if (exact) pickProduct(exact.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, products]);

  const nothingFound = q && productResults.length === 0 && customerResults.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent style={ANEK_FONT} className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className={BODY_TEXT}>পণ্য ও কাস্টমার খুঁজুন</DialogTitle>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="পণ্যের নাম, SKU, বারকোড বা কাস্টমারের নাম লিখুন..."
              className="pl-9 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                aria-label="খোঁজ মুছুন"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {nothingFound ? (
            <p className={typography("body-muted", "px-2 py-8 text-center")}>
              “{query}” মিলে এমন কিছু পাওয়া যায়নি — নাম, SKU বা বারকোড দিয়ে চেষ্টা করুন।
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {productResults.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {q && customerResults.length > 0 && (
                    <li className={typography("small", "px-1 font-semibold text-muted-foreground")}>
                      পণ্য ({productResults.length})
                    </li>
                  )}
                  {productResults.map((m) => {
                    const low = m.stock <= m.reorderLevel;
                    const days = daysUntil(m.expiry);
                    return (
                      <li key={m.id}>
                        <div className="group flex w-full items-center gap-3 rounded-md border bg-card p-2 transition-colors hover:border-primary hover:bg-accent">
                          <button
                            type="button"
                            onClick={() => pickProduct(m.id)}
                            aria-label={`${m.name} এর বিবরণ খুলুন`}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
                          >
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                              {m.imageUrl ? (
                                <img
                                  src={m.imageUrl}
                                  alt={m.name}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <ShoppingBasket className="h-6 w-6 text-muted-foreground" aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn(BODY_TEXT, "truncate font-medium")}>{m.name}</p>
                                <span className={cn(BODY_TEXT, "shrink-0 text-muted-foreground")}>{currency(m.sellPrice)}</span>
                              </div>
                              <p className={typography("body-muted", "truncate")}>
                                {m.sku}{m.category ? ` · ${m.category}` : ""}
                                {m.aliases && m.aliases.length > 0 && ` · ওরফে ${m.aliases.slice(0, 3).join(", ")}`}
                              </p>
                              <div className={cn(BODY_TEXT, "mt-1 flex flex-wrap items-center gap-2")}>
                                <Badge variant={low ? "destructive" : "secondary"} className="px-1.5">
                                  {bnNumber(m.stock)} স্টকে আছে
                                </Badge>
                                {m.barcode && (
                                  <span className={cn("truncate font-mono text-muted-foreground", BODY_TEXT)}>
                                    {m.barcode}
                                  </span>
                                )}
                                {days >= 0 && days <= 60 && (
                                  <span className={cn(BODY_TEXT, "truncate text-warning")}>
                                    {bnNumber(days)} দিনের মধ্যে মেয়াদ শেষ
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToSale(m);
                            }}
                            disabled={m.stock <= 0}
                            className="shrink-0 gap-1 rounded-lg bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400"
                            aria-label={`${m.name} বিক্রিতে যোগ করুন`}
                          >
                            <Plus className="h-4 w-4" />
                            বিক্রিতে যোগ
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {customerResults.length > 0 && (
                <ul className="flex flex-col gap-2">
                  <li className={typography("small", "px-1 font-semibold text-muted-foreground")}>
                    কাস্টমার ({customerResults.length})
                  </li>
                  {customerResults.map((c) => (
                    <li key={c.name}>
                      <button
                        type="button"
                        onClick={() => pickCustomer(c.name)}
                        aria-label={`${c.name} এর বিবরণ খুলুন`}
                        className="flex w-full items-center gap-3 rounded-md border bg-card p-2 text-left transition-colors hover:border-primary hover:bg-accent"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                          <UserRound className="h-5 w-5" aria-hidden />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className={cn(BODY_TEXT, "block truncate font-medium")}>{c.name}</span>
                          <span className={typography("body-muted", "block truncate")}>
                            {bnNumber(c.tx)} টি লেনদেন
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className={typography("body-muted", "flex items-center justify-between border-t px-4 py-2")}>
          <span>
            {q
              ? `${bnNumber(productResults.length + customerResults.length)} টি ফলাফল`
              : bnNumber(productResults.length) + " টি পণ্য"}
            {q && productResults.length === 60 && " (প্রথম ৬০টি দেখানো হচ্ছে)"}
          </span>
          <span className="hidden sm:inline">
            যেকোনো জায়গা থেকে খুলতে{" "}
            <kbd className={cn(BODY_TEXT, "rounded border bg-muted px-1 py-0.5 font-medium")}>⌘ K</kbd> চাপুন
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
