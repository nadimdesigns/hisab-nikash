import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowLeft, Clock, Download, Mail, MapPin, Pencil, Phone, StickyNote, Wallet } from "lucide-react";
import { z } from "zod";

import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { currency } from "@/lib/format";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { dataKey, isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";
import { useShop, type SaleItem } from "@/store/shop";
import { applyCustomerPayment } from "@/lib/customerPayments";
import { loadPayments, PAYMENTS_KEY, type PaymentEntry } from "@/lib/customerPaymentsLog";
import {
  loadProfiles,
  PROFILES_KEY,
  saveProfiles,
  type CustomerProfile,
} from "@/lib/customerProfiles";

const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(20, "ফোন ২০ অক্ষরের কম হতে হবে")
    .regex(/^[+\d\s()-]*$/, "শুধু সংখ্যা, স্পেস এবং + ( ) - অনুমোদিত")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(255, "ইমেইল অনেক বড়")
    .email("অবৈধ ইমেইল ঠিকানা")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(200, "ঠিকানা ২০০ অক্ষরের কম হতে হবে").optional().or(z.literal("")),
  notes: z.string().trim().max(500, "নোট ৫০০ অক্ষরের কম হতে হবে").optional().or(z.literal("")),
});

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

type HistoryEntry = {
  id: string;
  date: string;
  kind: "cash" | "due" | "payment";
  items: SaleItem[];
  total: number;
};

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerName = decodeURIComponent(id ?? "");
  const { sales, updateSale } = useShop();

  const [dues, setDues] = useState<DueEntry[]>(() => loadDues());
  const [payments, setPayments] = useState<PaymentEntry[]>(() => loadPayments());
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === DUES_KEY) setDues(loadDues());
      if (e.key === PAYMENTS_KEY) setPayments(loadPayments());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const stats = useMemo(() => {
    let purchases = 0;
    let cashBilled = 0;
    let dueEntries = 0;
    let dueBilled = 0;
    let paid = 0;
    let due = 0;
    let lastPurchase: string | null = null;
    sales
      .filter((s) => (s.customer || "Walk-in") === customerName)
      .forEach((s) => {
        const paidForSale =
          s.amountPaid ?? ((s.saleType ?? "cash") === "credit" ? 0 : s.total);
        const clampedPaid = Math.max(0, Math.min(paidForSale, s.total));
        const outstanding = s.total - clampedPaid;
        purchases += 1;
        cashBilled += s.total;
        paid += clampedPaid;
        if (outstanding > 0) due += outstanding;
        if (!lastPurchase || new Date(s.date) > new Date(lastPurchase))
          lastPurchase = s.date;
      });
    dues
      .filter((d) => (d.customer || "Walk-in") === customerName)
      .forEach((d) => {
        dueEntries += 1;
        dueBilled += d.total;
        due += d.total;
        if (!lastPurchase || new Date(d.date) > new Date(lastPurchase))
          lastPurchase = d.date;
      });
    // Payments allocated to standalone dues shrink `dueBilled` (because the
    // dues bucket total dropped) without increasing sale.amountPaid. Add
    // those back to reconstruct the original totalBilled and derive paid.
    const dueAllocatedPaid = payments
      .filter((p) => (p.customer || "Walk-in") === customerName)
      .reduce((s, p) => s + (p.allocatedToDues ?? 0), 0);
    const totalBilled = cashBilled + dueBilled + dueAllocatedPaid;
    const paidTotal = paid + dueAllocatedPaid;
    return {
      purchases,
      cashBilled,
      dueEntries,
      dueBilled: dueBilled + dueAllocatedPaid,
      totalBilled,
      paid: paidTotal,
      due,
      lastPurchase,
    };
  }, [sales, dues, payments, customerName]);

  const history = useMemo<HistoryEntry[]>(() => {
    const cashEntries: HistoryEntry[] = sales
      .filter((s) => (s.customer || "Walk-in") === customerName)
      .map((s) => ({ id: s.id, date: s.date, kind: "cash", items: s.items, total: s.total }));
    const dueEntriesList: HistoryEntry[] = dues
      .filter((d) => (d.customer || "Walk-in") === customerName)
      .map((d) => ({ id: d.id, date: d.date, kind: "due", items: d.items, total: d.total }));
    const paymentEntries: HistoryEntry[] = payments
      .filter((p) => (p.customer || "Walk-in") === customerName)
      .map((p) => ({ id: p.id, date: p.date, kind: "payment", items: [], total: p.amount }));
    return [...cashEntries, ...dueEntriesList, ...paymentEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [sales, dues, payments, customerName]);

  const [paymentInput, setPaymentInput] = useState("");

  // Customer profile (contact info) — persisted in localStorage
  const [profiles, setProfiles] = useState<Record<string, CustomerProfile>>(() => loadProfiles());
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === PROFILES_KEY) setProfiles(loadProfiles());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  const profile: CustomerProfile = profiles[customerName] ?? {};
  const hasProfileInfo = Boolean(profile.phone || profile.email || profile.address || profile.notes);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CustomerProfile>(profile);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerProfile, string>>>({});

  const startEdit = () => {
    setDraft(profile);
    setErrors({});
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setDraft(profile);
    setErrors({});
    setIsEditing(false);
  };
  const saveEdit = () => {
    if (isReadOnly()) {
      notifyReadOnlyBlocked();
      return;
    }
    const parsed = profileSchema.safeParse(draft);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CustomerProfile, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof CustomerProfile;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    const cleaned: CustomerProfile = {
      phone: parsed.data.phone || undefined,
      email: parsed.data.email || undefined,
      address: parsed.data.address || undefined,
      notes: parsed.data.notes || undefined,
    };
    const next = { ...profiles, [customerName]: cleaned };
    if (!cleaned.phone && !cleaned.email && !cleaned.address && !cleaned.notes) {
      delete next[customerName];
    }
    setProfiles(next);
    saveProfiles(next);
    setErrors({});
    setIsEditing(false);
    toast({ title: "কাস্টমারের তথ্য সংরক্ষিত হয়েছে" });
  };

  const updateDraft = <K extends keyof CustomerProfile>(key: K, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };


  const recordCustomerPayment = (amount: number) => {
    if (isReadOnly()) {
      notifyReadOnlyBlocked();
      return 0;
    }
    const applied = applyCustomerPayment<DueEntry>(customerName, amount, {
      sales,
      dues,
      updateSale,
      setDues: (next) => setDues(next),
    });
    // Re-sync payments ledger for the current tab (storage events don't
    // fire for same-window writes).
    setPayments(loadPayments());
    return applied;
  };




  const exportCSV = () => {
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
    history.forEach((h) => {
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
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safeName = customerName.replace(/[^a-z0-9-_]+/gi, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `PharmaSee_${safeName}_transactions_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "CSV এক্সপোর্ট হয়েছে", description: `${customerName} এর লেনদেন ডাউনলোড হয়েছে।` });
  };

  const hasAny = stats.purchases + stats.dueEntries > 0 || payments.some((p) => (p.customer || "Walk-in") === customerName);
  const hasDue = stats.due > 0;

  return (
    <AppLayout title="কাস্টমার বিবরণ">
      <div
        className="mx-auto max-w-3xl space-y-4"
        style={{ fontFamily: "'Anek Bangla', sans-serif" }}
      >
        {/* Top Action Bar */}
        <div className="home-card-appear flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/customers")}
            className="h-10 gap-1.5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-3.5 font-semibold hover:from-emerald-200/70 hover:to-emerald-100/70 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>সকল কাস্টমার</span>
          </Button>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startEdit}
                className="h-10 gap-1.5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-3.5 font-semibold hover:from-emerald-200/70 hover:to-emerald-100/70 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>{hasProfileInfo ? "সম্পাদনা" : "তথ্য যোগ"}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-3.5 font-semibold hover:from-emerald-200/70 hover:to-emerald-100/70 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
              onClick={exportCSV}
              disabled={history.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              <span>এক্সপোর্ট</span>
            </Button>
          </div>
        </div>

        {/* Unified Customer Profile & Identity Card */}
        <Card
          style={{ animationDelay: "50ms" }}
          className={cn(
            "home-hero-appear overflow-hidden rounded-3xl border",
            hasDue
              ? "border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
              : "border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5",
          )}
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className={typography("h3", "m-0 truncate leading-tight")}>
                    {customerName || "কাস্টমার"}
                  </h1>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold dark:bg-white/10",
                      hasDue
                        ? "text-rose-600 dark:text-rose-300"
                        : "text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        hasDue ? "bg-rose-500" : "bg-emerald-500",
                      )}
                    />
                    {hasDue ? `বাকি ${currency(stats.due)}` : "পরিশোধিত"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasAny
                    ? `${stats.purchases + stats.dueEntries}টি লেনদেন · সর্বশেষ ${
                        stats.lastPurchase
                          ? format(new Date(stats.lastPurchase), "MMM d, yyyy")
                          : "—"
                      }`
                    : "এখনও কোনো লেনদেন নেই"}
                </p>
              </div>
            </div>

            {/* Contact Info or Edit Form */}
            {!isEditing ? (
              hasProfileInfo && (
                <dl className="mt-4 grid grid-cols-1 gap-2.5 border-t border-black/5 pt-4 dark:border-white/10 sm:grid-cols-2">
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="ফোন" value={profile.phone} hasDue={hasDue} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="ইমেইল" value={profile.email} hasDue={hasDue} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="ঠিকানা" value={profile.address} hasDue={hasDue} />
                  <InfoRow icon={<StickyNote className="h-4 w-4" />} label="নোট" value={profile.notes} wide hasDue={hasDue} />
                </dl>
              )
            ) : (
              <div className="mt-4 space-y-3 border-t border-black/5 pt-4 dark:border-white/10">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldRow label="ফোন" htmlFor="cust-phone" error={errors.phone}>
                    <Input
                      id="cust-phone"
                      type="tel"
                      inputMode="tel"
                      maxLength={20}
                      className="h-[44px] rounded-xl bg-white dark:bg-white/10"
                      placeholder="+880 1XXX XXXXXX"
                      value={draft.phone ?? ""}
                      onChange={(e) => updateDraft("phone", e.target.value)}
                      aria-invalid={Boolean(errors.phone)}
                    />
                  </FieldRow>
                  <FieldRow label="ইমেইল" htmlFor="cust-email" error={errors.email}>
                    <Input
                      id="cust-email"
                      type="email"
                      maxLength={255}
                      className="h-[44px] rounded-xl bg-white dark:bg-white/10"
                      placeholder="name@example.com"
                      value={draft.email ?? ""}
                      onChange={(e) => updateDraft("email", e.target.value)}
                      aria-invalid={Boolean(errors.email)}
                    />
                  </FieldRow>
                </div>
                <FieldRow label="ঠিকানা" htmlFor="cust-address" error={errors.address}>
                  <Input
                    id="cust-address"
                    maxLength={200}
                    className="h-[44px] rounded-xl bg-white dark:bg-white/10"
                    placeholder="রাস্তা, শহর"
                    value={draft.address ?? ""}
                    onChange={(e) => updateDraft("address", e.target.value)}
                    aria-invalid={Boolean(errors.address)}
                  />
                </FieldRow>
                <FieldRow label="নোট" htmlFor="cust-notes" error={errors.notes}>
                  <Textarea
                    id="cust-notes"
                    maxLength={500}
                    rows={2}
                    className="rounded-xl bg-white dark:bg-white/10"
                    placeholder="পছন্দ, রিমাইন্ডার…"
                    value={draft.notes ?? ""}
                    onChange={(e) => updateDraft("notes", e.target.value)}
                    aria-invalid={Boolean(errors.notes)}
                  />
                </FieldRow>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="rounded-xl bg-white hover:bg-white"
                  >
                    বাতিল
                  </Button>
                  <Button
                    type="button"
                    onClick={saveEdit}
                    className="rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400"
                  >
                    সংরক্ষণ
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balanced 3-Column Financial Summary */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <StatTile label="মোট বিল" value={currency(stats.totalBilled)} tone="default" delay={100} />
          <StatTile label="পরিশোধিত" value={currency(stats.paid)} tone="success" delay={150} />
          <StatTile
            label="বকেয়া"
            value={currency(stats.due)}
            tone={hasDue ? "destructive" : "success"}
            delay={200}
          />
        </div>

        {/* Quick Due Payment Card — only when due exists */}
        {hasDue && (
          <Card
            style={{ animationDelay: "240ms" }}
            className="home-card-appear rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5"
          >
            <CardContent className="p-4 sm:p-5">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">টাকা জমা নিন</h3>
                <button
                  type="button"
                  onClick={() => setPaymentInput(String(stats.due))}
                  className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-white/80 dark:bg-white/10 dark:text-emerald-300"
                >
                  পুরো বকেয়া ({currency(stats.due)})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="টাকার পরিমাণ লিখুন..."
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  className="h-11 flex-1 rounded-xl bg-white dark:bg-white/10"
                />
                <Button
                  type="button"
                  className="h-11 shrink-0 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 px-4 font-semibold text-white transition-colors hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400"
                  onClick={() => {
                    const amount = parseFloat(paymentInput);
                    if (!Number.isFinite(amount) || amount <= 0) {
                      toast({ title: "সঠিক টাকার পরিমাণ দিন", variant: "destructive" });
                      return;
                    }
                    if (amount > stats.due + 0.005) {
                      toast({
                        title: "পরিমাণ বকেয়ার বেশি",
                        description: `${customerName} এর বকেয়া ${currency(stats.due)}।`,
                        variant: "destructive",
                      });
                      return;
                    }
                    const applied = recordCustomerPayment(amount);
                    setPaymentInput("");
                    toast({
                      title: "টাকা গ্রহণ হয়েছে",
                      description: `${currency(applied)} ${customerName} এর হিসাবে যোগ হয়েছে।`,
                    });
                  }}
                >
                  <Wallet className="h-4 w-4" /> পরিশোধ
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History Listing Cards */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-foreground">লেনদেনের ইতিহাস</h2>
            {hasAny && (
              <span className="text-xs font-medium text-muted-foreground">
                মোট {history.length}টি
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="home-card-appear rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 py-10 text-center text-sm text-muted-foreground dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5">
              এখনও কোনো লেনদেন নেই।
            </div>
          ) : (
            <ol className="space-y-2">
              {history.map((h, idx) => {
                const isPayment = h.kind === "payment";
                const isDue = h.kind === "due";
                const itemCount = h.items.reduce((s, it) => s + it.qty, 0);
                const preview = isPayment
                  ? "বকেয়া পরিশোধ"
                  : h.items.slice(0, 2).map((it) => it.name).join(", ");
                const more = !isPayment && h.items.length > 2 ? ` +${h.items.length - 2} আরও` : "";
                const badgeLabel =
                  isDue ? "বাকি বিক্রি" : isPayment ? "টাকা জমা" : "নগদ বিক্রি";
                const cardTint = isDue
                  ? "border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
                  : "border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5";

                const TxnIcon = isDue ? Clock : isPayment ? Wallet : ArrowDownLeft;

                return (
                  <li
                    key={`${h.kind}-${h.id}`}
                    style={{ animationDelay: `${Math.min(idx, 12) * 45 + 260}ms` }}
                    className={cn(
                      "home-card-appear group flex items-center gap-3 rounded-2xl border px-4 py-[18px] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:px-5 sm:py-[22px]",
                      cardTint,
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[100px] bg-white/60 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 dark:bg-white/10",
                        isDue
                          ? "text-rose-600 dark:text-rose-300"
                          : "text-emerald-600 dark:text-emerald-300",
                      )}
                    >
                      <TxnIcon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-[6px]">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {preview}
                            {more}
                          </span>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10",
                              isDue
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-bold tabular-nums",
                            isDue
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-700 dark:text-emerald-300",
                          )}
                        >
                          {isDue ? "−" : "+"}
                          {currency(h.total)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center text-xs text-muted-foreground">
                        <span className="truncate">
                          {isPayment ? "রসিদ" : `${itemCount}টি আইটেম`} ·{" "}
                          {format(new Date(h.date), "MMM d, yyyy · h:mm a")}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive";
  delay?: number;
}) {
  const isDestructive = tone === "destructive";
  const valueClass = isDestructive
    ? "text-rose-600 dark:text-rose-400"
    : "text-emerald-700 dark:text-emerald-300";
  const bgClass = isDestructive
    ? "border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 dark:border-rose-500/25 dark:from-rose-500/15 dark:to-rose-500/5"
    : "border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5";
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn("home-card-appear min-w-0 rounded-2xl p-3.5 text-center transition-transform duration-200 hover:-translate-y-0.5 sm:p-4 sm:text-left", bgClass)}
    >
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-base font-bold tabular-nums sm:text-xl", valueClass)}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  wide = false,
  hasDue = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  wide?: boolean;
  hasDue?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={cn("flex items-center gap-2.5 rounded-2xl bg-white/50 px-3 py-2 dark:bg-white/5", wide && "sm:col-span-2")}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[100px] bg-white/60 dark:bg-white/10",
          hasDue ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && (
        <p className={typography("small", "text-destructive")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
