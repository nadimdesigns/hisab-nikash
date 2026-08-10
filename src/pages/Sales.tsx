import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Trash2, Receipt, Users, UserCircle2, Search, X, Wallet, ShoppingBag, AlertCircle, CalendarIcon, Download, Pencil, SlidersHorizontal, Plus, Check, Undo2, ListFilter } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useShop, useShopHydrated, SaleItem, getPaymentStatus } from "@/store/shop";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { currency, useResponsiveCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { clearDraft, loadDrafts, saveDraft } from "@/lib/drafts";
import { useDraftsListener } from "@/hooks/use-drafts-listener";
import { typography } from "@/lib/typography";
import { DailySalesTable } from "@/components/sales/DailySalesTable";

type DueEntry = {
  id: string;
  date: string;
  customer: string;
  items: SaleItem[];
  total: number;
};

import { dataKey } from "@/lib/demoMode";
const DUES_KEY = dataKey("medishop-dues-v1");

const loadDues = (): DueEntry[] => {
  try {
    const raw = localStorage.getItem(DUES_KEY);
    return raw ? (JSON.parse(raw) as DueEntry[]) : [];
  } catch {
    return [];
  }
};

export default function Sales() {
  const { products, sales, recordSale, updateSale, deleteSale } = useShop();
  const hydrated = useShopHydrated();
  // Mobile-aware currency formatter — uses K / L / Cr suffixes on small
  // screens so big totals never overflow the stat cards.
  const fmtMoney = useResponsiveCurrency();

  // ===== New Sale state =====
  // Hydrate from persisted draft so an in-progress cart survives reloads.
  const initialDrafts = useMemo(() => loadDrafts(), []);
  const [customer, setCustomer] = useState(initialDrafts.cash?.customer ?? "");
  const [items, setItems] = useState<SaleItem[]>(initialDrafts.cash?.items ?? []);
  const [pickId, setPickId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [saleType, setSaleType] = useState<string>("cash");

  // Persist the cash draft cart whenever it changes.
  useEffect(() => {
    saveDraft("cash", { customer, items });
  }, [customer, items]);

  // If a draft is mutated externally (e.g., Inventory removed an item from
  // this cart to allow a product deletion), reflect that here so we don't
  // immediately overwrite the change on the next render.
  // Debounced so a rapid burst of draft mutations (e.g. fast quantity edits
  // or barcode scans in another tab) collapses into a single re-render.
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
      toast({ title: `Only ${m.stock} in stock`, variant: "destructive" });
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
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    const sale = recordSale({ customer: customer.trim() || "Walk-in", items });
    if (!sale) {
      toast({ title: "Insufficient stock for one or more items", variant: "destructive" });
      return;
    }
    setItems([]);
    setCustomer("");
    clearDraft("cash");
    toast({ title: "Sale recorded", description: `Invoice total ${currency(sale.total)}` });
  };

  // ===== Due Customers state =====
  const [dues, setDues] = useState<DueEntry[]>(() => loadDues());
  const [dueCustomer, setDueCustomer] = useState(initialDrafts.due?.customer ?? "");
  const [dueItems, setDueItems] = useState<SaleItem[]>(initialDrafts.due?.items ?? []);
  const [duePickId, setDuePickId] = useState<string>("");
  const [dueQty, setDueQty] = useState<number>(1);
  const [dueSaleType, setDueSaleType] = useState<string>("credit");

  // Persist the due (credit) draft cart whenever it changes.
  useEffect(() => {
    saveDraft("due", { customer: dueCustomer, items: dueItems });
  }, [dueCustomer, dueItems]);

  // Same debounced cross-tab sync for the due (credit) draft cart.
  useDraftsListener(() => {
    const drafts = loadDrafts();
    const next = drafts.due?.items ?? [];
    setDueItems((prev) => {
      const sameLength = prev.length === next.length;
      const sameRefs = sameLength && prev.every((p, i) =>
        p.productId === next[i].productId && p.qty === next[i].qty
      );
      return sameRefs ? prev : next;
    });
  });

  useEffect(() => {
    try {
      localStorage.setItem(DUES_KEY, JSON.stringify(dues));
    } catch {
      // ignore
    }
  }, [dues]);

  const dueTotal = useMemo(
    () => dueItems.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    [dueItems]
  );

  const totalOutstanding = useMemo(
    () => dues.reduce((s, d) => s + d.total, 0),
    [dues]
  );

  const addDueItemFor = (productId: string, quantity: number) => {
    const m = products.find((x) => x.id === productId);
    if (!m) return;
    if (quantity < 1) return;
    const existing = dueItems.find((i) => i.productId === m.id);
    if (existing) {
      setDueItems(dueItems.map((i) => i.productId === m.id ? { ...i, qty: quantity } : i));
    } else {
      setDueItems([...dueItems, { productId: m.id, name: m.name, qty: quantity, unitPrice: m.sellPrice, unitCost: m.costPrice }]);
    }
  };

  const handleDueSelectProduct = (id: string) => {
    setDuePickId(id);
    addDueItemFor(id, dueQty);
  };

  const handleDueQtyChange = (value: number) => {
    const next = Number.isFinite(value) && value > 0 ? value : 1;
    setDueQty(next);
    if (duePickId) addDueItemFor(duePickId, next);
  };

  const removeDueItem = (id: string) =>
    setDueItems(dueItems.filter((i) => i.productId !== id));

  const recordDue = () => {
    if (!dueCustomer.trim()) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }
    if (dueItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    const entry: DueEntry = {
      id: Math.random().toString(36).slice(2, 10),
      date: new Date().toISOString(),
      customer: dueCustomer.trim(),
      items: dueItems,
      total: dueItems.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    };
    setDues([entry, ...dues]);
    setDueItems([]);
    setDueCustomer("");
    setDuePickId("");
    setDueQty(1);
    clearDraft("due");
    toast({ title: "Due recorded", description: `${entry.customer} owes ${currency(entry.total)}` });
  };

  const clearDue = (id: string) => setDues(dues.filter((d) => d.id !== id));

  // Record a payment against a customer's outstanding due balance.
  // Applies oldest-first (FIFO): reduces each due entry's total until the
  // payment is fully consumed; entries that reach 0 are removed.
  const recordCustomerPayment = (customerName: string, amount: number) => {
    let remaining = amount;
    const target = customerName || "Walk-in";
    const next: DueEntry[] = [];
    const ordered = [...dues].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    for (const d of ordered) {
      if ((d.customer || "Walk-in") !== target || remaining <= 0) {
        next.push(d);
        continue;
      }
      if (d.total <= remaining) {
        remaining -= d.total;
        // entry fully paid — drop it
      } else {
        next.push({ ...d, total: +(d.total - remaining).toFixed(2) });
        remaining = 0;
      }
    }
    // Restore original (newest-first) ordering used elsewhere
    next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDues(next);
    return amount - remaining;
  };

  // ===== Customers aggregation =====
  type CustomerRow = {
    name: string;
    purchases: number;       // # of cash sale invoices
    cashBilled: number;      // sum of cash sale totals
    dueEntries: number;      // # of due entries
    dueBilled: number;       // sum of due-entry totals
    totalBilled: number;     // cashBilled + dueBilled
    paid: number;            // cash sales are fully paid
    due: number;             // outstanding (sum of due entries)
    lastPurchase: string | null;
  };

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
      cur.purchases += 1;
      cur.cashBilled += s.total;
      cur.totalBilled += s.total;
      cur.paid += s.total;
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
    return Array.from(map.values()).sort((a, b) => b.totalBilled - a.totalBilled);
  }, [sales, dues]);

  // ===== Customers filters =====
  const [custQuery, setCustQuery] = useState("");
  const [custStatus, setCustStatus] = useState<"all" | "due" | "cleared">("all");
  const [custDueRange, setCustDueRange] = useState<"any" | "gt0" | "gt500" | "gt2000">("any");
  type CustSortKey =
    | "name-asc"
    | "name-desc"
    | "due-desc"
    | "due-asc"
    | "billed-desc"
    | "billed-asc"
    | "purchases-desc"
    | "recent";
  const [custSort, setCustSort] = useState<CustSortKey>("billed-desc");
  const [custDateRange, setCustDateRange] = useState<DateRange | undefined>(undefined);

  // Per-customer activity dates (sales + dues), used to test the date-range filter
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

  // ===== Customers filter sheet (draft — commits on Apply) =====
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

  // ===== Edit sale drawer =====
  type EditDraft = {
    customer: string;
    saleType: "cash" | "credit";
    items: SaleItem[];
    amountPaid: number;
  };
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const openEditSale = (sale: typeof sales[number]) => {
    const t = sale.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    setEditingSaleId(sale.id);
    setEditDraft({
      customer: sale.customer ?? "",
      saleType: sale.saleType ?? "cash",
      items: sale.items.map((i) => ({ ...i })),
      amountPaid:
        sale.amountPaid ?? ((sale.saleType ?? "cash") === "credit" ? 0 : t),
    });
  };
  const closeEditSale = () => {
    setEditingSaleId(null);
    setEditDraft(null);
  };
  const saveEditSale = () => {
    if (!editingSaleId || !editDraft) return;
    if (editDraft.items.some((i) => !i.name.trim())) {
      toast({ title: "Item name cannot be empty", variant: "destructive" });
      return;
    }
    if (editDraft.items.some((i) => !Number.isFinite(i.unitPrice) || i.unitPrice < 0)) {
      toast({ title: "Enter a valid price for each item", variant: "destructive" });
      return;
    }
    const newTotal = editDraft.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const clampedPaid = Math.max(0, Math.min(editDraft.amountPaid, newTotal));
    updateSale(editingSaleId, {
      customer: editDraft.customer.trim() || "Walk-in",
      saleType: editDraft.saleType,
      items: editDraft.items.map((i) => ({ ...i, name: i.name.trim() })),
      amountPaid: clampedPaid,
    });
    toast({ title: "Sale updated" });
    closeEditSale();
  };
  const [confirmDeleteSale, setConfirmDeleteSale] = useState(false);
  const handleDeleteSale = () => {
    if (!editingSaleId) return;
    deleteSale(editingSaleId);
    toast({ title: "Sale deleted" });
    setConfirmDeleteSale(false);
    closeEditSale();
  };

  // ===== Customer details drawer =====
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [paymentInput, setPaymentInput] = useState("");
  useEffect(() => {
    if (!selectedCustomer) setPaymentInput("");
  }, [selectedCustomer]);
  const selectedRow = useMemo(
    () => customers.find((c) => c.name === selectedCustomer) ?? null,
    [customers, selectedCustomer]
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
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
    rows.push(["Summary"]);
    rows.push(["Customer", selectedRow.name]);
    rows.push(["Total billed", selectedRow.totalBilled.toFixed(2)]);
    rows.push(["Cash billed", selectedRow.cashBilled.toFixed(2)]);
    rows.push(["Due billed", selectedRow.dueBilled.toFixed(2)]);
    rows.push(["Paid", selectedRow.paid.toFixed(2)]);
    rows.push(["Outstanding due", selectedRow.due.toFixed(2)]);

    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safeName = selectedRow.name.replace(/[^a-z0-9-_]+/gi, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `PharmaSee_${safeName}_transactions_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${selectedRow.name} transactions downloaded.` });
  };

  // Cash Sale tab = paid sales. Due Sale tab = unpaid + partial sales.
  // Status is derived from amountPaid via getPaymentStatus().
  const cashSales = useMemo(
    () => sales.filter((s) => getPaymentStatus(s) === "paid"),
    [sales],
  );
  const dueSales = useMemo(
    () => sales.filter((s) => getPaymentStatus(s) !== "paid"),
    [sales],
  );
  const [salesTab, setSalesTab] = useState<"cash" | "due">("cash");
  // Within-tab chip filter for the Due tab.
  const [dueFilter, setDueFilter] = useState<"all" | "partial" | "unpaid">("all");
  // Cross-tab customer filter (applies to both Cash and Due lists).
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);
  const [customerFilterQuery, setCustomerFilterQuery] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "cash" | "credit">("all");

  // One-click payment status toggles. Records a payment (full) or reverses it.
  const markSalePaid = (sale: typeof sales[number]) => {
    updateSale(sale.id, { amountPaid: sale.total });
    toast({
      title: "Marked as paid",
      description: `${sale.customer || "Walk-in"} \u00b7 ${currency(sale.total)}`,
    });
  };
  const markSaleUnpaid = (sale: typeof sales[number]) => {
    updateSale(sale.id, { amountPaid: 0 });
    toast({
      title: "Marked as unpaid",
      description: `${sale.customer || "Walk-in"} \u00b7 ${currency(sale.total)}`,
    });
  };

  const filteredCashSales = useMemo(
    () =>
      customerFilter === "all"
        ? cashSales
        : cashSales.filter((s) => (s.customer || "Walk-in") === customerFilter),
    [cashSales, customerFilter],
  );

  // Due tab: rows should keep showing while their paymentStatus changes
  // (the badge updates in place). We compute the "fresh" filter result
  // every render, then union it with a sticky snapshot of IDs that were
  // visible since the last filter/tab change. Snapshot resets when the
  // user changes the filter chip or returns to the Due tab.
  const freshDueRows = useMemo(
    () =>
      dueFilter === "all"
        ? dueSales
        : dueSales.filter((s) => getPaymentStatus(s) === dueFilter),
    [dueSales, dueFilter],
  );
  const [stickyDueIds, setStickyDueIds] = useState<Set<string>>(new Set());
  // Reset the snapshot whenever the user actively changes filter or tab.
  useEffect(() => {
    setStickyDueIds(new Set(freshDueRows.map((s) => s.id)));
    // Intentionally only depends on filter + tab — NOT on freshDueRows,
    // so post-edit recomputes (e.g. status flip) don't shrink the snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueFilter, salesTab, customerFilter]);
  // Render = sticky rows ∪ fresh matches, preserving the original sales order.
  const filteredDueSales = useMemo(() => {
    const freshIds = new Set(freshDueRows.map((s) => s.id));
    const visibleIds = new Set<string>([...stickyDueIds, ...freshIds]);
    let list = sales.filter((s) => visibleIds.has(s.id));
    if (customerFilter !== "all") {
      list = list.filter((s) => (s.customer || "Walk-in") === customerFilter);
    }
    return list;
  }, [sales, freshDueRows, stickyDueIds, customerFilter]);

  const dueCounts = useMemo(() => {
    let partial = 0;
    let unpaid = 0;
    for (const s of dueSales) {
      const st = getPaymentStatus(s);
      if (st === "partial") partial += 1;
      else if (st === "unpaid") unpaid += 1;
    }
    return { all: dueSales.length, partial, unpaid };
  }, [dueSales]);

  const renderSalesList = (list: typeof sales, emptyLabel: string) => (
    !hydrated ? (
      <ul className="space-y-3" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          </li>
        ))}
      </ul>
    ) : (
      <ul className="space-y-3">
        {list.slice(0, 12).map((s) => (
          <SaleRow
            key={s.id}
            sale={s}
            onEdit={() => openEditSale(s)}
            onMarkPaid={() => markSalePaid(s)}
            onMarkUnpaid={() => markSaleUnpaid(s)}
            onAmountPaidChange={(amt) => updateSale(s.id, { amountPaid: amt })}
          />
        ))}
        {list.length === 0 && (
          <p className={typography("body-muted")}>{emptyLabel}</p>
        )}
      </ul>
    )
  );

  return (
    <AppLayout title="All Sales">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={saleTypeFilter} onValueChange={(v) => setSaleTypeFilter(v as "all" | "cash" | "credit")}>
            <SelectTrigger className="min-w-0 flex-1 md:w-[180px] md:flex-none">
              <SelectValue placeholder="All Sales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sales</SelectItem>
              <SelectItem value="cash">Cash Sales</SelectItem>
              <SelectItem value="credit">Due Sales</SelectItem>
            </SelectContent>
          </Select>
          <Button
            asChild
            variant="outline"
            className="ml-auto shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
          >
            <Link to="/new-sale">
              <Plus className="h-4 w-4" /> Cash Sale
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="shrink-0 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
          >
            <Link to="/due-sale">
              <Plus className="h-4 w-4" /> Due Sale
            </Link>
          </Button>
        </div>

        <DailySalesTable
          sales={sales.filter((s) => saleTypeFilter === "all" || s.saleType === saleTypeFilter)}
        />
      </div>

      <Sheet open={!!editingSaleId} onOpenChange={(v) => !v && closeEditSale()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-4 py-4 sm:px-6">
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Edit sale
            </SheetTitle>
            <SheetDescription>Update customer, sale type, and item details.</SheetDescription>
          </SheetHeader>

          {editDraft && (
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Customer name</Label>
                    <Input
                      value={editDraft.customer}
                      onChange={(e) =>
                        setEditDraft((d) => (d ? { ...d, customer: e.target.value } : d))
                      }
                      placeholder="Walk-in"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sale type</Label>
                    <Select
                      value={editDraft.saleType}
                      onValueChange={(v) =>
                        setEditDraft((d) => (d ? { ...d, saleType: v as "cash" | "credit" } : d))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sale type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit">Due Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Items</Label>
                  <ul className="space-y-3">
                    {editDraft.items.map((it, idx) => (
                      <li key={`${it.productId}-${idx}`} className="rounded-md border bg-muted/20 p-3">
                        <div className="space-y-2">
                          <div className="space-y-1.5">
                            <Label className={typography("body-muted")}>Item name</Label>
                            <Input
                              value={it.name}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        items: d.items.map((x, i) =>
                                          i === idx ? { ...x, name: e.target.value } : x,
                                        ),
                                      }
                                    : d,
                                )
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className={typography("body-muted")}>Qty</Label>
                              <Input
                                type="number"
                                min={1}
                                value={it.qty}
                                onChange={(e) => {
                                  const n = Math.max(1, Math.floor(+e.target.value || 1));
                                  setEditDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          items: d.items.map((x, i) =>
                                            i === idx ? { ...x, qty: n } : x,
                                          ),
                                        }
                                      : d,
                                  );
                                }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className={typography("body-muted")}>Unit price</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={it.unitPrice}
                                onChange={(e) => {
                                  const n = +e.target.value;
                                  setEditDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          items: d.items.map((x, i) =>
                                            i === idx ? { ...x, unitPrice: Number.isFinite(n) ? n : 0 } : x,
                                          ),
                                        }
                                      : d,
                                  );
                                }}
                              />
                            </div>
                          </div>
                          <p className={typography("body-muted", "text-right")}>
                            Subtotal: <span className="font-semibold text-foreground">{currency(it.qty * it.unitPrice)}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {(() => {
                  const draftTotal = editDraft.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
                  const clampedPaid = Math.max(0, Math.min(editDraft.amountPaid, draftTotal));
                  const status = getPaymentStatus({
                    total: draftTotal,
                    amountPaid: clampedPaid,
                    saleType: editDraft.saleType,
                  });
                  return (
                    <>
                      <div className="space-y-1.5 border-t pt-3">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="edit-amount-paid">Amount paid</Label>
                          <PaymentStatusBadge status={status} />
                        </div>
                        <Input
                          id="edit-amount-paid"
                          type="number"
                          min={0}
                          max={draftTotal}
                          step="0.01"
                          value={editDraft.amountPaid}
                          onChange={(e) => {
                            const n = +e.target.value;
                            setEditDraft((d) =>
                              d ? { ...d, amountPaid: Number.isFinite(n) ? n : 0 } : d,
                            );
                          }}
                        />
                        <p className={typography("body-muted")}>
                          Outstanding: <span className="font-semibold text-foreground">{currency(Math.max(0, draftTotal - clampedPaid))}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t pt-3">
                        <p className={typography("body-muted")}>Total</p>
                        <p className={typography("h3")}>{currency(draftTotal)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="border-t bg-background px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteSale(true)}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={closeEditSale}>Cancel</Button>
                <Button onClick={saveEditSale}>Save changes</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeleteSale} onOpenChange={setConfirmDeleteSale}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the sale entry from Recent sales. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSale}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

/**
 * Single sale list row with an always-on inline amount-paid editor.
 *
 * The input keeps a local string draft so the user can clear/type freely
 * without the parent's clamp logic snapping the field on every keystroke.
 * We commit to the store on blur or Enter, clamping into [0, total].
 * Empty input commits as 0.
 */
function SaleRow({
  sale,
  onEdit,
  onMarkPaid,
  onMarkUnpaid,
  onAmountPaidChange,
}: {
  sale: import("@/store/shop").Sale;
  onEdit: () => void;
  onMarkPaid: () => void;
  onMarkUnpaid: () => void;
  onAmountPaidChange: (amountPaid: number) => void;
}) {
  const status = getPaymentStatus(sale);
  const isPaid = status === "paid";
  const currentPaid =
    sale.amountPaid ?? ((sale.saleType ?? "cash") === "credit" ? 0 : sale.total);
  const currentPaidRounded = Math.ceil(currentPaid);

  const [draft, setDraft] = useState<string>(currentPaidRounded.toString());
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  // Re-sync local draft when the store's amountPaid changes from elsewhere
  // (e.g. Mark as paid button, Edit drawer save). Skip while focused so we
  // don't clobber an in-progress edit.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(currentPaidRounded.toString());
    }
  }, [currentPaidRounded]);

  const commit = () => {
    const n = draft.trim() === "" ? 0 : Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(currentPaidRounded.toString());
      return;
    }
    const clamped = Math.max(0, Math.min(Math.ceil(n), Math.ceil(sale.total)));
    if (clamped !== currentPaid) {
      onAmountPaidChange(clamped);
      toast({
        title: "Payment updated",
        description: `${sale.customer || "Walk-in"} \u00b7 ${currency(clamped)} of ${currency(sale.total)}`,
      });
    }
    setDraft(clamped.toString());
  };

  return (
    <li className="flex flex-col gap-2 border-b pb-2 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={typography("body-strong", "truncate")}>{sale.customer}</p>
          <p className={typography("body-muted")}>
            {format(new Date(sale.date), "MMM d, HH:mm")} · {sale.items.length} item
            {sale.items.length > 1 ? "s" : ""}
          </p>
        </div>
        <PaymentStatusBadge status={status} />
        <span className={typography("body", "font-semibold")}>
          {currency(isPaid ? sale.total : Math.max(0, sale.total - currentPaid))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor={`paid-${sale.id}`} className={typography("body-muted", "shrink-0")}>
          Paid
        </Label>
        <Input
          id={`paid-${sale.id}`}
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          max={Math.ceil(sale.total)}
          step="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(currentPaidRounded.toString());
              e.currentTarget.blur();
            }
          }}
          aria-label={`Amount paid for ${sale.customer}`}
          className="h-9 max-w-[7.5rem] flex-1"
        />
        <span className={typography("body-muted", "shrink-0")}>/ {currency(sale.total)}</span>
        <div className="ml-auto flex items-center gap-1">
          {isPaid ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Mark sale for ${sale.customer} as unpaid`}
              title="Mark as unpaid"
              onClick={onMarkUnpaid}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-success hover:text-success"
              aria-label={`Mark sale for ${sale.customer} as paid`}
              title="Mark as paid"
              onClick={onMarkPaid}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label={`Edit sale for ${sale.customer}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
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
