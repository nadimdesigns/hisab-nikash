/**
 * Extracted from `src/components/sales/CustomersPanel.tsx` (lines 123–149, 354–440, 722–944).
 * This drawer/sheet was unreachable in `CustomersPanel` because customer rows
 * navigate directly to `/customers/:id` (`src/pages/CustomerDetails.tsx`).
 * Preserved here on the `orphan` branch.
 */
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Download, ShoppingBag, UserCircle2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { currency, formatDate } from "@/lib/format";
import { typography } from "@/lib/typography";
import { dataKey, isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";
import type { Sale, SaleItem } from "@/store/shop";

type DueEntry = {
  id: string;
  date: string;
  customer: string;
  items: SaleItem[];
  total: number;
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

const DUES_KEY = dataKey("medishop-dues-v1");

export function CustomerDetailsSheetOrphan({
  selectedCustomer,
  setSelectedCustomer,
  customers,
  sales,
  dues,
  setDues,
}: {
  selectedCustomer: string | null;
  setSelectedCustomer: (name: string | null) => void;
  customers: CustomerRow[];
  sales: Sale[];
  dues: DueEntry[];
  setDues: (next: DueEntry[]) => void;
}) {
  const [paymentInput, setPaymentInput] = useState("");
  useEffect(() => {
    if (!selectedCustomer) setPaymentInput("");
  }, [selectedCustomer]);

  const selectedRow = useMemo(
    () => customers.find((c) => c.name === selectedCustomer) ?? null,
    [customers, selectedCustomer],
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
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [selectedCustomer, sales, dues]);

  const recordCustomerPayment = (customerName: string, amount: number) => {
    if (isReadOnly()) {
      notifyReadOnlyBlocked();
      return 0;
    }
    let remaining = amount;
    const target = customerName || "Walk-in";
    const next = dues
      .map((d) => {
        if ((d.customer || "Walk-in") !== target || remaining <= 0) return d;
        if (d.total <= remaining) {
          remaining -= d.total;
          return null;
        }
        const updated = { ...d, total: d.total - remaining };
        remaining = 0;
        return updated;
      })
      .filter(Boolean) as DueEntry[];
    setDues(next);
    try {
      localStorage.setItem(DUES_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
    return amount - remaining;
  };

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
    rows.push(["সারাংশ"]);
    rows.push(["কাস্টমার", selectedRow.name]);
    rows.push(["মোট বিল", selectedRow.totalBilled.toFixed(2)]);
    rows.push(["নগদ বিল", selectedRow.cashBilled.toFixed(2)]);
    rows.push(["বাকি বিল", selectedRow.dueBilled.toFixed(2)]);
    rows.push(["পরিশোধিত", selectedRow.paid.toFixed(2)]);
    rows.push(["অপরিশোধিত বাকি", selectedRow.due.toFixed(2)]);

    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safeName = selectedRow.name.replace(/[^a-z0-9-_]+/gi, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `HisabNikash_${safeName}_transactions_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "CSV এক্সপোর্ট হয়েছে", description: `${selectedRow.name} এর লেনদেন ডাউনলোড হয়েছে।` });
  };

  return (
    <Sheet open={!!selectedCustomer} onOpenChange={(v) => !v && setSelectedCustomer(null)}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-primary" />
                <span className="truncate">{selectedRow?.name ?? "Customer"}</span>
              </SheetTitle>
              <SheetDescription>
                {selectedRow
                  ? `${selectedRow.purchases + selectedRow.dueEntries} total transaction${
                      selectedRow.purchases + selectedRow.dueEntries === 1 ? "" : "s"
                    } · Last purchase ${
                      selectedRow.lastPurchase
                        ? formatDate(selectedRow.lastPurchase, "MMM d, yyyy")
                        : "—"
                    }`
                  : ""}
              </SheetDescription>
            </div>
            {selectedRow && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={exportCustomerCSV}
                disabled={selectedHistory.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            )}
          </div>
        </SheetHeader>

        {selectedRow && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <SummaryTile
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Total billed"
                value={currency(selectedRow.totalBilled)}
              />
              <SummaryTile
                icon={<Wallet className="h-4 w-4" />}
                label="Paid"
                value={currency(selectedRow.paid)}
                tone="success"
              />
              <SummaryTile
                icon={<AlertCircle className="h-4 w-4" />}
                label="Due"
                value={currency(selectedRow.due)}
                tone={selectedRow.due > 0 ? "destructive" : "muted"}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border bg-muted/30 p-2.5">
                <p className={typography("body-muted")}>Cash sales</p>
                <p className={typography("body", "mt-0.5 font-semibold")}>
                  {selectedRow.purchases} · {currency(selectedRow.cashBilled)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2.5">
                <p className={typography("body-muted")}>Due entries</p>
                <p className={typography("body", "mt-0.5 font-semibold")}>
                  {selectedRow.dueEntries} · {currency(selectedRow.dueBilled)}
                </p>
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className={typography("body", "font-semibold")}>Record payment</h3>
                <span className={typography("body-muted")}>
                  Outstanding:{" "}
                  <span className="font-medium text-foreground">{currency(selectedRow.due)}</span>
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
                  disabled={selectedRow.due <= 0}
                  className="sm:flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentInput(String(selectedRow.due))}
                    disabled={selectedRow.due <= 0}
                  >
                    Full
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1"
                    disabled={selectedRow.due <= 0}
                    onClick={() => {
                      const amount = parseFloat(paymentInput);
                      if (!Number.isFinite(amount) || amount <= 0) {
                        toast({ title: "Enter a valid amount", variant: "destructive" });
                        return;
                      }
                      if (amount > selectedRow.due + 0.005) {
                        toast({
                          title: "Amount exceeds due",
                          description: `${selectedRow.name} owes ${currency(selectedRow.due)}.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      const applied = recordCustomerPayment(selectedRow.name, amount);
                      setPaymentInput("");
                      toast({
                        title: "Payment recorded",
                        description: `${currency(applied)} applied to ${selectedRow.name}.`,
                      });
                    }}
                  >
                    <Wallet className="h-3.5 w-3.5" /> Pay
                  </Button>
                </div>
              </div>
              {selectedRow.due <= 0 && (
                <p className={typography("body-muted", "mt-2")}>No outstanding balance.</p>
              )}
            </div>

            <div>
              <h3 className={typography("body", "mb-2 font-semibold")}>Transaction history</h3>
              <ScrollArea className="h-[calc(100vh-32rem)] min-h-[12rem] rounded-md border">
                {selectedHistory.length === 0 ? (
                  <p className={typography("body-muted", "p-6 text-center")}>
                    No transactions yet.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {selectedHistory.map((h) => (
                      <li key={`${h.kind}-${h.id}`} className="p-3">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={h.kind === "due" ? "destructive" : "secondary"}>
                              {h.kind === "due" ? "Due" : "Cash"}
                            </Badge>
                            <span className={typography("body-muted")}>
                              {formatDate(h.date, "MMM d, yyyy · HH:mm")}
                            </span>
                          </div>
                          <span className={typography("body", "font-semibold")}>
                            {currency(h.total)}
                          </span>
                        </div>
                        <ul className="space-y-0.5 pl-1">
                          {h.items.map((it) => (
                            <li
                              key={it.productId}
                              className={typography(
                                "body-muted",
                                "flex items-center justify-between gap-2",
                              )}
                            >
                              <span className="truncate">
                                {it.name} <span className="text-foreground/70">× {it.qty}</span>
                              </span>
                              <span>{currency(it.qty * it.unitPrice)}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
