import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Download, Mail, MapPin, Pencil, Phone, StickyNote, UserCircle2, Wallet } from "lucide-react";
import { z } from "zod";

import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
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

type CustomerProfile = {
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

const PROFILES_KEY = dataKey("medishop-customer-profiles-v1");

const loadProfiles = (): Record<string, CustomerProfile> => {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CustomerProfile>) : {};
  } catch {
    return {};
  }
};

const saveProfiles = (profiles: Record<string, CustomerProfile>) => {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
};

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

  const hasAny = stats.purchases + stats.dueEntries > 0;
  const hasDue = stats.due > 0;

  return (
    <AppLayout title="কাস্টমার">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top nav */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> ফিরে যান
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/customers">সব কাস্টমার</Link>
          </Button>
        </div>

        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle2 className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className={typography("h2", "truncate")}>{customerName || "কাস্টমার"}</h1>
            <p className={typography("body-muted")}>
              {hasAny
                ? `${stats.purchases + stats.dueEntries}টি লেনদেন · সর্বশেষ ${
                    stats.lastPurchase
                      ? format(new Date(stats.lastPurchase), "MMM d, yyyy")
                      : "—"
                  }`
                : "এখনও কোনো লেনদেন নেই।"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={exportCSV}
            disabled={history.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">এক্সপোর্ট</span>
          </Button>
        </div>

        {/* Customer details / edit */}
        <Card className="shadow-soft">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className={typography("body-strong")}>কাস্টমারের বিস্তারিত</h3>
              {!isEditing && (
                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                  {hasProfileInfo ? "সম্পাদনা" : "তথ্য যোগ করুন"}
                </Button>
              )}
            </div>

            {!isEditing ? (
              hasProfileInfo ? (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="ফোন" value={profile.phone} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="ইমেইল" value={profile.email} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="ঠিকানা" value={profile.address} />
                  <InfoRow icon={<StickyNote className="h-4 w-4" />} label="নোট" value={profile.notes} wide />
                </dl>
              ) : (
                <p className={typography("body-muted")}>এখনও কোনো যোগাযোগের তথ্য নেই। এই কাস্টমারের জন্য ফোন, ইমেইল, ঠিকানা বা নোট যোগ করুন।</p>
              )
            ) : (
              <div className="space-y-3">
                <FieldRow label="ফোন" htmlFor="cust-phone" error={errors.phone}>
                  <Input
                    id="cust-phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={20}
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
                    placeholder="name@example.com"
                    value={draft.email ?? ""}
                    onChange={(e) => updateDraft("email", e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                  />
                </FieldRow>
                <FieldRow label="ঠিকানা" htmlFor="cust-address" error={errors.address}>
                  <Input
                    id="cust-address"
                    maxLength={200}
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
                    rows={3}
                    placeholder="পছন্দ, অ্যালার্জি, রিমাইন্ডার…"
                    value={draft.notes ?? ""}
                    onChange={(e) => updateDraft("notes", e.target.value)}
                    aria-invalid={Boolean(errors.notes)}
                  />
                </FieldRow>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    বাতিল
                  </Button>
                  <Button type="button" onClick={saveEdit}>
                    সংরক্ষণ
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="মোট বিল" value={currency(stats.totalBilled)} />
          <StatTile label="পরিশোধিত" value={currency(stats.paid)} tone="success" />
          <StatTile
            label="বকেয়া"
            value={currency(stats.due)}
            tone={hasDue ? "destructive" : "muted"}
          />
        </div>

        {/* Payment — only when due exists */}
        {hasDue && (
          <Card className="shadow-soft">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className={typography("body-strong")}>টাকা গ্রহণ</h3>
                <span className={typography("body-muted")}>
                  বাকি: <span className="font-medium text-destructive">{currency(stats.due)}</span>
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
                  className="sm:flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentInput(String(stats.due))}
                  >
                    পুরো
                  </Button>
                  <Button
                    type="button"
                    className="gap-1"
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction history */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className={typography("h4")}>লেনদেন</h2>
            {hasAny && (
              <span className={typography("body-muted")}>
                মোট {history.length}টি
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-10 text-center">
                <p className={typography("body-muted")}>এখনও কোনো লেনদেন নেই।</p>
              </CardContent>
            </Card>
          ) : (
            <ol className="space-y-2">
              {history.map((h) => {
                const isPayment = h.kind === "payment";
                const itemCount = h.items.reduce((s, it) => s + it.qty, 0);
                const preview = isPayment
                  ? "টাকা গ্রহণ করা হয়েছে"
                  : h.items.slice(0, 2).map((it) => it.name).join(", ");
                const more = !isPayment && h.items.length > 2 ? ` +${h.items.length - 2} আরও` : "";
                const badgeVariant =
                  h.kind === "due" ? "destructive" : h.kind === "payment" ? "default" : "secondary";
                const badgeLabel =
                  h.kind === "due" ? "বাকি" : h.kind === "payment" ? "পেমেন্ট" : "নগদ";
                return (
                  <li key={`${h.kind}-${h.id}`}>
                    <Card className="shadow-none border transition-colors hover:bg-muted/40">
                      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                        <Badge variant={badgeVariant} className="shrink-0">
                          {badgeLabel}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className={typography("body", "truncate font-medium")}>
                            {preview}
                            {more}
                          </p>
                          <p className={typography("body-muted", "truncate")}>
                            {format(new Date(h.date), "MMM d, yyyy · HH:mm")}
                            {isPayment
                              ? " · রসিদ"
                              : ` · ${itemCount}টি আইটেম`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              typography("body-strong"),
                              isPayment && "text-success",
                            )}
                          >
                            {isPayment ? "+" : ""}
                            {currency(h.total)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
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
}: {
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
    <div className="min-w-0 rounded-xl bg-card p-4 shadow-soft">
      <p className={typography("body-muted", "truncate")}>{label}</p>
      <p className={cn(typography("h3", "mt-1 truncate"), valueClass)}>{value}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  wide?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={cn("flex items-start gap-2", wide && "sm:col-span-2")}>
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={typography("body-muted", "text-xs uppercase tracking-wide")}>{label}</p>
        <p className={typography("body", "break-words")}>{value}</p>
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
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p className={typography("small", "text-destructive")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
