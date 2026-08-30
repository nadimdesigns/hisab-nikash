import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, Truck } from "lucide-react";
import { useShop, useShopHydrated, PurchaseItem } from "@/store/shop";
import { Skeleton } from "@/components/ui/skeleton";
import { currency, formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { typography } from "@/lib/typography";
import { ProductPickerSheet } from "@/components/ProductPickerSheet";
import { QtyStepper } from "@/components/QtyStepper";

export default function Purchases() {
  const { products, purchases, recordPurchase } = useShop();
  const hydrated = useShopHydrated();
  const [supplier, setSupplier] = useState("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [pickId, setPickId] = useState("");
  // Drives the quantity stepper's increment: কেজি moves in quarters, পিস in ones.
  const pickedProduct = products.find((m) => m.id === pickId);
  const [qty, setQty] = useState<number>(10);
  const [cost, setCost] = useState<number>(0);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.unitCost, 0), [items]);

  const handlePick = (v: string) => {
    const m = products.find((x) => x.id === v);
    if (!m) return;
    setPickId(v);
    setCost(m.costPrice);
    if (qty < 1) return;
    const existing = items.find((i) => i.productId === m.id);
    if (existing) {
      setItems(items.map((i) => i.productId === m.id ? { ...i, qty: i.qty + qty } : i));
    } else {
      setItems([...items, { productId: m.id, name: m.name, qty, unitCost: m.costPrice }]);
    }
    setPickId("");
    setQty(10);
    setCost(0);
  };

  const submit = () => {
    if (!supplier.trim()) return toast({ title: "পাইকারের নাম প্রয়োজন", variant: "destructive" });
    if (items.length === 0) return toast({ title: "অন্তত একটি আইটেম যোগ করুন", variant: "destructive" });
    recordPurchase({
      supplier,
      supplierCompany: supplierCompany.trim() || undefined,
      supplierPhone: supplierPhone.trim() || undefined,
      items,
    });
    setItems([]); setSupplier(""); setSupplierCompany(""); setSupplierPhone("");
    toast({ title: "ক্রয় সংরক্ষিত হয়েছে — স্টক হালনাগাদ হয়েছে" });
  };

  return (
    <AppLayout title="ক্রয়">
      <div className="grid gap-6 lg:grid-cols-3 w-full min-w-0 max-w-full overflow-x-hidden">
        <Card className="lg:col-span-2 shadow-soft min-w-0 max-w-full overflow-hidden">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className={typography("h4", "m-0 leading-tight")}>
                {formatDate(now, "MMM d, yyyy")}
              </CardTitle>
              <span className={typography("body", "text-muted-foreground tabular-nums")}>
                {formatDate(now, "h:mm:ss a")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-[34px] px-4 sm:px-6">
            <div>
              <Input
                placeholder="পাইকারের নাম"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="bg-[#f7f7f7] dark:bg-white/5"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                placeholder="পাইকারের কোম্পানির নাম"
                value={supplierCompany}
                onChange={(e) => setSupplierCompany(e.target.value)}
                className="bg-[#f7f7f7] dark:bg-white/5"
              />
              <Input
                type="tel"
                placeholder="পাইকারের ফোন নম্বর"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                className="bg-[#f7f7f7] dark:bg-white/5"
              />
            </div>

            <div className="flex w-full items-start gap-2">
              <div className="min-w-0 flex-1">
                <ProductPickerSheet
                  products={products}
                  value={pickId}
                  onChange={handlePick}
                  placeholder="পণ্য নির্বাচন করুন..."
                  className="bg-[#f7f7f7] hover:bg-[#f7f7f7] dark:bg-white/5 dark:hover:bg-white/5"
                />
              </div>
              <div className="w-[120px] shrink-0">
                <QtyStepper value={qty} onChange={setQty} unit={pickedProduct?.unit} className="bg-[#f7f7f7] dark:bg-white/5" />
              </div>
            </div>

            <div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(+e.target.value)}
                placeholder="ইউনিট খরচ"
                className="bg-[#f7f7f7] dark:bg-white/5"
              />
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44%] min-w-[160px]">আইটেম</TableHead>
                    <TableHead className="text-right">পরিমাণ</TableHead>
                    <TableHead className="text-right">ইউনিট খরচ</TableHead>
                    <TableHead className="text-right">সাবটোটাল</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className={typography("body-muted", "py-6 text-center")}>এখনো কোনো আইটেম নেই।</TableCell></TableRow>
                  ) : items.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="w-[44%] min-w-[160px] font-medium">
                        <span className="item-name-cell">{i.name}</span>
                      </TableCell>
                      <TableCell className="text-right">{i.qty}</TableCell>
                      <TableCell className="text-right">{currency(i.unitCost)}</TableCell>
                      <TableCell className="text-right">{currency(i.qty * i.unitCost)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== idx))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-[15px]">
              <p className={typography("body-muted")}>মোট</p>
              <p className={typography("h3")}>{currency(total)}</p>
            </div>

            <Button onClick={submit} className="w-full" size="lg" disabled={items.length === 0}>
              ক্রয় সংরক্ষণ
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft min-w-0 max-w-full overflow-hidden">
          <CardHeader><CardTitle>সাম্প্রতিক ক্রয়</CardTitle></CardHeader>
          <CardContent>
            {!hydrated ? (
              <ul className="space-y-3" aria-busy="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-3">
                {purchases.slice(0, 12).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className={typography("body-strong", "truncate")}>
                        {p.supplier}
                        {p.supplierCompany && (
                          <span className={typography("body-muted", "font-normal")}> · {p.supplierCompany}</span>
                        )}
                      </p>
                      <p className={typography("body-muted")}>
                        {formatDate(p.date, "MMM d, HH:mm")} · {p.items.length}টি আইটেম
                        {p.supplierPhone && <> · {p.supplierPhone}</>}
                      </p>
                    </div>
                    <span className={typography("body", "font-semibold")}>{currency(p.total)}</span>
                  </li>
                ))}
                {purchases.length === 0 && <p className={typography("body-muted")}>এখনো কোনো ক্রয় নেই।</p>}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
