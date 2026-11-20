import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Product, useShop, useShopHydrated } from "@/store/shop";
import { Skeleton } from "@/components/ui/skeleton";
import { bnNumber, currency, daysUntil } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { DEFAULT_UNIT, UNITS, unitLabel, type UnitCode } from "@/lib/copy";
import CrossTabSyncBanner from "./CrossTabSyncBanner";
import { filterAndSortProducts, type ExpiryFilter, type SortKey } from "@/lib/inventoryFilters";
import { findDraftReferences, removeProductFromDrafts, type DraftReference } from "@/lib/drafts";
import { useDraftsListener } from "@/hooks/use-drafts-listener";
import { typography } from "@/lib/typography";

const empty: Omit<Product, "id"> = {
  name: "",
  sku: "",
  category: "",
  unit: DEFAULT_UNIT,
  batch: "",
  expiry: "",
  stock: 0,
  reorderLevel: 10,
  costPrice: 0,
  sellPrice: 0,
  barcode: "",
  aliases: [],
};


export default function InventoryPanel({
  query = "",
  batchQuery = "",
  category = "all",
  stockFilter = "all",
  expiryFilter = "all",
  sort = "name-asc",
  addOpen,
  setAddOpen,
  focusId,
  onFocusHandled,
  editOnFocus,
}: {
  query?: string;
  batchQuery?: string;
  category?: string;
  stockFilter?: "all" | "low" | "out" | "in";
  expiryFilter?: ExpiryFilter;
  sort?: SortKey;
  addOpen?: boolean;
  setAddOpen?: (v: boolean) => void;
  focusId?: string | null;
  onFocusHandled?: () => void;
  editOnFocus?: boolean;
}) {
  const { products, sales, purchases, addProduct, updateProduct, deleteProduct, restoreProduct } = useShop();
  const hydrated = useShopHydrated();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = addOpen ?? internalOpen;
  const setOpen = setAddOpen ?? setInternalOpen;
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(empty);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  // Count history that references the product being deleted, so we can warn the user.
  const deleteImpact = useMemo(() => {
    if (!pendingDelete) return { sales: 0, purchases: 0, soldQty: 0 };
    let salesCount = 0;
    let soldQty = 0;
    sales.forEach((s) => {
      const items = s.items.filter((i) => i.productId === pendingDelete.id);
      if (items.length) {
        salesCount += 1;
        soldQty += items.reduce((sum, i) => sum + i.qty, 0);
      }
    });
    const purchaseCount = purchases.filter((p) =>
      p.items.some((i) => i.productId === pendingDelete.id)
    ).length;
    return { sales: salesCount, purchases: purchaseCount, soldQty };
  }, [pendingDelete, sales, purchases]);

  // Active draft cart references for the product being deleted. We recompute
  // whenever the deletion target changes AND when drafts are mutated in any
  // tab, so the warning stays accurate while the dialog is open.
  const [draftRefs, setDraftRefs] = useState<DraftReference[]>([]);
  // Tracks the last-known blocked state so we can detect the transition
  // from "blocked by another tab's cart" → "unblocked" and announce it.
  const wasBlockedRef = useRef(false);
  // Per-item timestamp of the last "Item unblocked" toast we surfaced.
  // Cross-tab `storage` bursts can re-fire the unblock transition many
  // times in quick succession (e.g. another tab clearing then re-adding
  // the cart), so we throttle to at most one toast per item per window.
  const lastUnblockToastAtRef = useRef<Map<string, number>>(new Map());
  const UNBLOCK_TOAST_WINDOW_MS = 8000;
  useEffect(() => {
    // Run an immediate refresh whenever the deletion target changes so the
    // dialog opens with accurate references on the first paint.
    if (!pendingDelete) {
      setDraftRefs([]);
      wasBlockedRef.current = false;
      return;
    }
    const refs = findDraftReferences(pendingDelete.id);
    setDraftRefs(refs);
    // Seed the baseline without firing a toast — the user just opened the
    // dialog, so this isn't an "unblocked" event yet.
    wasBlockedRef.current = refs.length > 0;
  }, [pendingDelete]);
  // Debounced subscription so a flurry of cart edits (same-tab events or a
  // rapid burst of cross-tab `storage` events) only triggers one recompute.
  useDraftsListener(() => {
    if (!pendingDelete) return;
    const refs = findDraftReferences(pendingDelete.id);
    setDraftRefs(refs);
    if (wasBlockedRef.current && refs.length === 0) {
      // The other tab cleared the conflicting cart — surface that so the
      // user knows they can now proceed without re-checking the dialog.
      // Throttle per product id so a burst of cross-tab updates only
      // results in a single toast within the configured window.
      const itemId = pendingDelete.id;
      const now = Date.now();
      const last = lastUnblockToastAtRef.current.get(itemId) ?? 0;
      if (now - last >= UNBLOCK_TOAST_WINDOW_MS) {
        lastUnblockToastAtRef.current.set(itemId, now);
        toast({
          title: "Item unblocked",
          description: `“${pendingDelete.name}” is no longer in any draft cart.`,
        });
      }
    }
    wasBlockedRef.current = refs.length > 0;
  });
  const blockedByDraft = draftRefs.length > 0;

  const filtered = useMemo(
    () =>
      filterAndSortProducts(products, {
        query,
        batchQuery,
        category,
        stockFilter,
        expiryFilter,
        sort,
      }),
    [products, query, batchQuery, category, stockFilter, expiryFilter, sort],
  );

  // Category dropdown options — unique categories already in use across the
  // product list, plus the currently selected value so an existing product's
  // category is never lost while editing.
  const categoryOptions = useMemo(() => {
    const cats = Array.from(
      new Set(
        products
          .map((p) => p.category?.trim())
          .filter((c): c is string => !!c),
      ),
    ).sort((a, b) => a.localeCompare(b, "bn"));
    const current = form.category?.trim();
    if (current && !cats.includes(current)) cats.push(current);
    return cats;
  }, [products, form.category]);

  // Reset form to "new" mode whenever the dialog is opened from outside (e.g. header CTA)
  // and we don't have an editing target.
  useEffect(() => {
    if (open && !editing) {
      setForm(empty);
    }
    if (!open) {
      setEditing(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When asked to focus a specific product (e.g., from the global quick
  // search), scroll its row into view and flash a temporary highlight.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId) return;
    setHighlightId(focusId);
    const el = document.querySelector<HTMLElement>(
      `[data-product-id="${focusId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    onFocusHandled?.();
    if (editOnFocus) {
      const target = products.find((p) => p.id === focusId);
      if (target) openEdit(target);
    }
    const t = window.setTimeout(() => setHighlightId(null), 2200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, editOnFocus]);

  const openEdit = (m: Product) => {
    // Edit lives in the same dialog as add — dialog re-mounts per target via
    // the `key`, so form state is always fresh.
    setEditing(m);
    setForm({
      name: m.name,
      sku: m.sku,
      category: m.category ?? "",
      sellPrice: m.sellPrice,
      costPrice: m.costPrice,
      stock: m.stock,
      unit: m.unit,
      expiry: m.expiry,
      reorderLevel: m.reorderLevel,
      barcode: m.barcode ?? "",
      aliases: m.aliases ?? [],
      batch: m.batch ?? "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      toast({ title: "নাম এবং SKU প্রয়োজন", variant: "destructive" });
      return;
    }
    if (form.sellPrice < form.costPrice) {
      toast({ title: "বিক্রয় মূল্য মূল্যের চেয়ে কম", description: "সংরক্ষণের আগে দাম আবার যাচাই করুন।" });
    }
    if (editing) {
      updateProduct(editing.id, form);
      toast({ title: "পণ্য আপডেট হয়েছে" });
    } else {
      addProduct(form);
      toast({ title: "পণ্য যোগ করা হয়েছে" });
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    // Re-check at the moment of confirmation in case a draft was added in
    // another tab between opening and confirming the dialog.
    const liveRefs = findDraftReferences(pendingDelete.id);
    if (liveRefs.length > 0) {
      setDraftRefs(liveRefs);
      toast({
        title: "Cannot delete — in use by a draft cart",
        description: `Remove ${pendingDelete.name} from the open cart on the Sales page first.`,
        variant: "destructive",
      });
      return;
    }
    const snapshot = pendingDelete;
    const originalIndex = products.findIndex((m) => m.id === snapshot.id);
    deleteProduct(snapshot.id);
    setPendingDelete(null);
    const t = toast({
      title: "Product deleted",
      description: `${snapshot.name} — undo within 8 seconds`,
      duration: 8000,
      action: (
        <ToastAction
          altText="Undo delete"
          onClick={() => {
            restoreProduct(snapshot, originalIndex);
            t.dismiss();
            toast({ title: "Product restored", description: snapshot.name });
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="form-surface max-h-[85svh] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0">
          <DialogHeader className="shrink-0 px-6 pb-2 pt-6 text-left">
            <DialogTitle>{editing ? "পণ্য সম্পাদনা" : "পণ্য যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto overscroll-contain px-6 pb-4">
            <Field label="পণ্যের নাম" className="col-span-2">
              <Input className="h-[46px] rounded-xl bg-white dark:bg-white/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <Input className="h-[46px] rounded-xl bg-white dark:bg-white/10" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="ক্যাটাগরি">
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger aria-label="ক্যাটাগরি" className="h-[46px] rounded-xl bg-white dark:bg-white/10">
                  <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      কোনো ক্যাটাগরি নেই
                    </SelectItem>
                  ) : (
                    categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="একক">
              <Select
                value={form.unit}
                onValueChange={(v) => setForm({ ...form, unit: v as UnitCode })}
              >
                <SelectTrigger aria-label="একক" className="h-[46px] rounded-xl bg-white dark:bg-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.code} value={u.code}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="স্টক পরিমাণ">
              <Input className="h-[46px] rounded-xl bg-white dark:bg-white/10" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} />
            </Field>

            <Field label="মূল্য (ক্রয়)">
              <Input className="h-[46px] rounded-xl bg-white dark:bg-white/10" type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
            </Field>
            <Field label="বিক্রয় মূল্য">
              <Input className="h-[46px] rounded-xl bg-white dark:bg-white/10" type="number" min={0} step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} />
            </Field>
          </div>
          <DialogFooter className="grid shrink-0 grid-cols-2 gap-3 px-6 pb-6 pt-3 sm:gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-12 rounded-xl bg-white hover:bg-white md:h-11">
              বাতিল
            </Button>
            <Button onClick={submit} className="h-12 rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 font-semibold text-white hover:from-brand-600 hover:via-brand-500 hover:to-brand-400 md:h-11">
              {editing ? "সংরক্ষণ করুন" : "যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrossTabSyncBanner className="mb-3" />

      {!hydrated ? (
        <ul className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={`sk-${i}`}
              aria-busy="true"
              className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 px-4 py-[18px] dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5"
            >
              <Skeleton className="h-11 w-11 shrink-0 rounded-[100px] bg-white/60" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="ml-auto h-5 w-14 rounded-md" />
                <Skeleton className="ml-auto h-3 w-16" />
              </div>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div
          className={typography(
            "body-muted",
            "rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 py-10 text-center dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5",
          )}
        >
          No products found.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m, idx) => {
            // Permanent branding rule:
            // Healthy stock = Tint Green, Low/Out of stock = Tint Red
            const low = m.stock <= m.reorderLevel;
            const days = daysUntil(m.expiry);
            return (
              <li
                key={m.id}
                data-product-id={m.id}
                style={{ animationDelay: `${Math.min(idx, 12) * 45 + 100}ms` }}
                className={cn(
                  "home-card-appear flex items-center gap-3 rounded-2xl border px-4 py-[18px] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] sm:px-5 sm:py-[22px]",
                  low
                    ? "border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
                    : "border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5",
                  highlightId === m.id && "ring-2 ring-primary/50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {m.name}
                    </span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold tabular-nums dark:bg-white/10",
                        low
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-brand-700 dark:text-brand-300",
                      )}
                    >
                      {bnNumber(m.stock)} {unitLabel(m.unit)}
                    </span>
                  </div>

                  {(m.category || m.batch || m.expiry) && (
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {m.category && <span className="truncate">{m.category}</span>}
                      {(m.batch || m.expiry) && (
                        <span
                          className={cn(
                            "truncate",
                            !!m.expiry && days <= 60 && "font-medium text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {m.category ? "· " : ""}
                          {m.batch ? `${m.batch}${m.expiry ? " · " : ""}` : ""}
                          {m.expiry ? `${m.expiry} ${days >= 0 ? `(${days}d)` : "(expired)"}` : ""}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-1 whitespace-nowrap text-xs font-medium tabular-nums text-muted-foreground">
                    {currency(m.costPrice)} / {currency(m.sellPrice)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(m)}
                    className="h-9 w-9 rounded-[100px] bg-white/60 hover:bg-white/40 dark:bg-white/10"
                  >
                    <span aria-hidden="true" className="text-sm leading-none select-none">✏️</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPendingDelete(m)}
                    aria-label={`Delete ${m.name}`}
                    className="h-9 w-9 rounded-[100px] bg-white/60 text-rose-600 hover:bg-white/40 hover:text-rose-700 dark:bg-white/10 dark:text-rose-300"
                  >
                    <span aria-hidden="true" className="text-sm leading-none select-none">🗑️</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>এই পণ্যটি মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {pendingDelete ? (
                <div className="space-y-3">
                  <p>
                    <span className="font-medium text-foreground">{pendingDelete.name}</span> ({pendingDelete.sku}) will be
                    permanently removed from your inventory. This action cannot be undone.
                  </p>

                  {blockedByDraft && (
                    <div className={typography("body", "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-foreground")}>
                      <p className="mb-1.5 font-medium text-destructive">
                        Blocked — this product is in {draftRefs.length === 1 ? "an open draft cart" : `${draftRefs.length} open draft carts`}
                      </p>
                      <ul className="space-y-2">
                        {draftRefs.map((r) => (
                          <li
                            key={r.kind}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/20 bg-background/60 p-2"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">
                                {r.kind === "cash" ? "Cash sale draft" : "Due / credit draft"}
                              </p>
                              <p className="text-muted-foreground">
                                {r.customer} — {r.qty} unit{r.qty === 1 ? "" : "s"} reserved
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (!pendingDelete) return;
                                removeProductFromDrafts(pendingDelete.id, r.kind);
                                toast({
                                  title: "Removed from draft",
                                  description: `${pendingDelete.name} cleared from the ${r.kind === "cash" ? "cash sale" : "due / credit"} draft.`,
                                });
                              }}
                            >
                              Remove from this draft
                            </Button>
                          </li>
                        ))}
                      </ul>
                      {draftRefs.length > 1 && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (!pendingDelete) return;
                              const n = removeProductFromDrafts(pendingDelete.id);
                              toast({
                                title: "Removed from all drafts",
                                description: `${pendingDelete.name} cleared from ${n} draft${n === 1 ? "" : "s"}. You can now delete it.`,
                              });
                            }}
                          >
                            Remove from all drafts
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={typography("body", "rounded-md border bg-muted/40 p-3")}>
                    <p className="mb-1.5 font-medium text-foreground">What will happen</p>
                    <ul className="space-y-1">
                      <li>
                        Removes <span className="font-medium text-foreground">{bnNumber(pendingDelete.stock)} {unitLabel(pendingDelete.unit)}</span> in current stock
                        worth <span className="font-medium text-foreground">{currency(pendingDelete.stock * pendingDelete.costPrice)}</span> from inventory.
                      </li>
                      <li>
                        Past <span className="font-medium text-foreground">{deleteImpact.sales}</span> sale{deleteImpact.sales === 1 ? "" : "s"}
                        {" "}and <span className="font-medium text-foreground">{deleteImpact.purchases}</span> purchase{deleteImpact.purchases === 1 ? "" : "s"} referencing this item are
                        <span className="font-medium text-foreground"> kept</span> for accounting (snapshots of name, qty, prices remain intact).
                      </li>
                      <li>
                        New sales of <span className="font-medium text-foreground">{pendingDelete.name}</span> will no longer be possible.
                      </li>
                    </ul>
                  </div>

                  {!blockedByDraft && (deleteImpact.sales > 0 || deleteImpact.purchases > 0) && (
                    <p className={typography("body", "rounded-md border border-warning/40 bg-warning/10 p-2 text-foreground")}>
                      Heads up — this product has <span className="font-medium">{deleteImpact.sales + deleteImpact.purchases}</span> related transaction{deleteImpact.sales + deleteImpact.purchases === 1 ? "" : "s"}.
                      Consider setting stock to 0 or renaming instead if you only want to retire it.
                    </p>
                  )}
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{blockedByDraft ? "Close" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={blockedByDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {blockedByDraft ? "Cannot delete" : "Delete product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className ?? ""}>
      <label className="mb-1.5 ml-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
