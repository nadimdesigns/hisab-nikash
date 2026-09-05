import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Trash2, CalendarIcon, ImagePlus, Upload, X, ShoppingBasket } from "lucide-react";
import { Product, useShop, useShopHydrated } from "@/store/shop";
import { Skeleton } from "@/components/ui/skeleton";
import { bnNumber, currency, daysUntil, formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { format, parseISO } from "date-fns";
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
  expiry: new Date().toISOString().slice(0, 10),
  stock: 0,
  reorderLevel: 10,
  costPrice: 0,
  sellPrice: 0,
  imageUrl: undefined,
  barcode: "",
  aliases: [],
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

async function fileToCompressedDataUrl(file: File, maxDim = 480, quality = 0.8): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not load image"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}


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
    const el = document.querySelector<HTMLTableRowElement>(
      `[data-product-id="${focusId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    onFocusHandled?.();
    const t = window.setTimeout(() => setHighlightId(null), 2200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

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
      imageUrl: m.imageUrl,
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "পণ্য সম্পাদনা" : "পণ্য যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="পণ্যের ছবি" className="col-span-2">
              <ImageUploadField
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                productName={form.name}
              />
            </Field>
            <Field label="নাম" className="col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="ক্যাটাগরি">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="একক">
              <Select
                value={form.unit}
                onValueChange={(v) => setForm({ ...form, unit: v as UnitCode })}
              >
                <SelectTrigger aria-label="একক">
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
            <Field label="Batch">
              <Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
            </Field>
            <Field label="Barcode / UPN" className="col-span-2">
              <Input
                value={form.barcode ?? ""}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="বারকোড স্ক্যান বা পেস্ট করুন (ঐচ্ছিক)"
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </Field>
            <Field label="Aliases / ingredients" className="col-span-2">
              <Input
                value={(form.aliases ?? []).join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    aliases: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="যেমন: মিনিকেট, চাল, rice"
                autoComplete="off"
              />
            </Field>
            <Field label="Expiry">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.expiry && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                    {form.expiry ? formatDate(parseISO(form.expiry), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.expiry ? parseISO(form.expiry) : undefined}
                    onSelect={(d) =>
                      setForm({ ...form, expiry: d ? format(d, "yyyy-MM-dd") : "" })
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field label="Stock">
              <Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} />
            </Field>
            <Field label="Reorder level">
              <Input type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: +e.target.value })} />
            </Field>
            <Field label="Cost price">
              <Input type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
            </Field>
            <Field label="Sell price">
              <Input type="number" min={0} step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={submit}>{editing ? "সংরক্ষণ" : "যোগ করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrossTabSyncBanner className="mb-3" />

      <Card className="shadow-soft overflow-hidden rounded-[15px]">
        <CardContent className="p-0">
          <Table className="table-global">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] md:min-w-0">পণ্য</TableHead>
                <TableHead className="min-w-[150px] md:min-w-0">ক্যাটাগরি</TableHead>
                <TableHead className="min-w-[130px] text-right md:min-w-0">স্টক / দাম</TableHead>
                <TableHead className="w-[76px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hydrated ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} aria-busy="true">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto space-y-1.5">
                        <Skeleton className="ml-auto h-5 w-14 rounded-full" />
                        <Skeleton className="ml-auto h-3 w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  {filtered.map((m) => {
                    const low = m.stock <= m.reorderLevel;
                    const days = daysUntil(m.expiry);
                    return (
                      <TableRow
                        key={m.id}
                        data-product-id={m.id}
                        className={cn(
                          "transition-colors",
                          highlightId === m.id && "bg-primary/15 ring-2 ring-primary/40",
                        )}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                              {m.imageUrl ? (
                                <img
                                  src={m.imageUrl}
                                  alt={m.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <ShoppingBasket className="h-4 w-4 text-muted-foreground" aria-hidden />
                              )}
                            </div>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{m.name}</span>
                              <span className="mt-0.5 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {m.sku}
                              </span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate text-sm font-medium">{m.category || "—"}</div>
                          <div className={cn("mt-0.5 truncate text-xs text-muted-foreground", days <= 60 && "text-warning")}>
                            {m.batch ? `${m.batch} · ` : ""}{m.expiry} {days >= 0 ? `(${days}d)` : "(expired)"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                            low
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
                          )}>
                            {bnNumber(m.stock)} {unitLabel(m.unit)}
                          </span>
                          <div className="mt-0.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                            {currency(m.costPrice)} / {currency(m.sellPrice)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setPendingDelete(m)}
                              aria-label={`Delete ${m.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className={typography("body-muted", "py-10 text-center")}>
                        No products found.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ImageUploadField({
  value,
  onChange,
  productName,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  productName?: string;
}) {
  const [busy, setBusy] = useState(false);
  // The hidden <input type="file"> is shared by both the click-to-upload
  // image box and the "Replace image" button so we only have one DOM node
  // managing the file picker.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => fileInputRef.current?.click();

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Unsupported file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Maximum size is 2 MB.", variant: "destructive" });
      return;
    }
    try {
      setBusy(true);
      const url = await fileToCompressedDataUrl(file);
      onChange(url);
    } catch {
      toast({ title: "Could not read image", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Fallback label shown beside the box when the product hasn't been named
  // yet — keeps the layout balanced instead of leaving an empty column.
  const titleText = productName?.trim() || "Untitled product";

  return (
    <div className="flex items-start gap-3">
      {/* Click-to-upload thumbnail. When empty, it shows the upload icon and
          acts as the primary affordance for picking a file. When populated,
          it previews the image but stays clickable so users can swap by
          tapping the thumbnail directly too. */}
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        aria-label={value ? "Replace product image" : "Upload product image"}
        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted transition-colors hover:border-primary hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {value ? (
          <img src={value} alt="Product preview" className="h-full w-full object-cover" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-medium text-foreground">{titleText}</p>
        <p className="text-muted-foreground">
          PNG or JPG, up to 2 MB. Resized automatically for fast loading.
        </p>
        {value && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openPicker}
              disabled={busy}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Replace image
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

