import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { Search, Pill, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Medicine, useShop } from "@/store/shop";
import { currency, daysUntil } from "@/lib/format";
import { typography, BODY_TEXT } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { loadDrafts, saveDraft } from "@/lib/drafts";

const OPEN_EVENT = "medishop-open-quick-search";

/** Programmatically open the global medicine quick-search dialog. */
export function openMedicineQuickSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function MedicineQuickSearch() {
  const { medicines } = useShop();
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
  // medicine name first, then aliases/ingredients, with SKU/batch/barcode
  // available as exact-ish matches. `threshold` of 0.38 is forgiving enough
  // for typos and partial matches without producing noise.
  const fuse = useMemo(
    () =>
      new Fuse<Medicine>(medicines, {
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
    [medicines],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return medicines.slice(0, 60);
    return fuse.search(q).slice(0, 60).map((r) => r.item);
  }, [fuse, medicines, query]);

  const pick = (id: string) => {
    setOpen(false);
    navigate(`/stocks?focus=${encodeURIComponent(id)}`);
  };

  // Quick add-to-sale: append the medicine to the persistent "cash" draft
  // cart (or bump qty if already present) and jump to the Sales page so the
  // user can finalize the transaction. Mirrors the addItem logic in Sales.
  const addToSale = (m: Medicine) => {
    const drafts = loadDrafts();
    const current = drafts.cash;
    const existing = current?.items.find((i) => i.medicineId === m.id);
    const items = existing
      ? (current?.items ?? []).map((i) =>
          i.medicineId === m.id ? { ...i, qty: i.qty + 1 } : i,
        )
      : [
          ...(current?.items ?? []),
          {
            medicineId: m.id,
            name: m.name,
            qty: 1,
            unitPrice: m.sellPrice,
            unitCost: m.costPrice,
          },
        ];
    saveDraft("cash", { customer: current?.customer ?? "", items });
    setOpen(false);
    toast.success(`${m.name} added to sale`);
    navigate("/sales");
  };

  // Barcode / UPN auto-jump: when the typed (or scanned/pasted) value is an
  // exact match for a stored barcode, immediately navigate to that medicine.
  // Most USB barcode scanners "type" the code very quickly and append Enter,
  // so the exact-match check fires the instant the full code lands.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 4) return;
    const exact = medicines.find(
      (m) => (m.barcode ?? "").trim().toLowerCase() === q.toLowerCase(),
    );
    if (exact) pick(exact.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, medicines]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className={BODY_TEXT}>Find a medicine</DialogTitle>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name, alias, ingredient, SKU, batch, or scan a barcode..."
              className="pl-9 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {results.length === 0 ? (
            <p className={typography("body-muted", "px-2 py-8 text-center")}>
              No medicines match “{query}”.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.map((m) => {
                const low = m.stock <= m.reorderLevel;
                const days = daysUntil(m.expiry);
                return (
                  <li key={m.id}>
                    <div className="group flex w-full items-center gap-3 rounded-md border bg-card p-2 transition-colors hover:border-primary hover:bg-accent">
                      <button
                        type="button"
                        onClick={() => pick(m.id)}
                        aria-label={`Open details for ${m.name}`}
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
                            <Pill className="h-6 w-6 text-muted-foreground" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(BODY_TEXT, "truncate font-medium")}>{m.name}</p>
                            <span className={cn(BODY_TEXT, "shrink-0 text-muted-foreground")}>{currency(m.sellPrice)}</span>
                          </div>
                          <p className={typography("body-muted", "truncate")}>
                            {m.sku} · {m.category || "—"}
                            {m.aliases && m.aliases.length > 0 && ` · aka ${m.aliases.slice(0, 3).join(", ")}`}
                          </p>
                          <div className={cn(BODY_TEXT, "mt-1 flex flex-wrap items-center gap-2")}>
                            <Badge variant={low ? "destructive" : "secondary"} className="px-1.5">
                              {m.stock} in stock
                            </Badge>
                            {m.barcode && (
                              <span className={cn("truncate font-mono text-muted-foreground", BODY_TEXT)}>
                                {m.barcode}
                              </span>
                            )}
                            {days >= 0 && days <= 60 && (
                              <span className={cn(BODY_TEXT, "truncate text-warning")}>
                                Expires in {days}d
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
                        className="shrink-0 gap-1"
                        aria-label={`Add ${m.name} to sale`}
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={typography("body-muted", "flex items-center justify-between border-t px-4 py-2")}>
          <span>
            {results.length} result{results.length === 1 ? "" : "s"}
            {results.length === 60 && " (showing first 60)"}
          </span>
          <span className="hidden sm:inline">
            Tip: open anywhere with{" "}
            <kbd className={cn(BODY_TEXT, "rounded border bg-muted px-1 py-0.5 font-medium")}>⌘ K</kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
