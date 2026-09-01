import { useMemo, useState } from "react";
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
import { Plus, Trash2, Receipt } from "lucide-react";
import { useShop, SaleItem } from "@/store/shop";
import { currency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { typography } from "@/lib/typography";
import { ProductPickerSheet } from "@/components/ProductPickerSheet";
import { QtyStepper } from "@/components/QtyStepper";

export default function SalesPanel() {
  const { products, sales, recordSale } = useShop();
  const [customer, setCustomer] = useState("Walk-in");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [pickId, setPickId] = useState<string>("");
  // Drives the quantity stepper's increment: কেজি moves in quarters, পিস in ones.
  const pickedProduct = products.find((m) => m.id === pickId);
  const [qty, setQty] = useState<number>(1);

  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.unitPrice, 0), [items]);

  const addItem = () => {
    const m = products.find((x) => x.id === pickId);
    if (!m) return;
    if (qty < 1) return;
    if (m.stock < qty) {
      toast({ title: `Only ${m.stock} in stock`, variant: "destructive" });
      return;
    }
    const existing = items.find((i) => i.productId === m.id);
    if (existing) {
      setItems(items.map((i) => i.productId === m.id ? { ...i, qty: i.qty + qty } : i));
    } else {
      setItems([...items, { productId: m.id, name: m.name, qty, unitPrice: m.sellPrice, unitCost: m.costPrice }]);
    }
    setPickId("");
    setQty(1);
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
    setCustomer("Walk-in");
    toast({ title: "Sale recorded", description: `Invoice total ${currency(sale.total)}` });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="form-surface lg:col-span-2 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> নতুন চালান
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <ProductPickerSheet
                products={products}
                value={pickId}
                onChange={setPickId}
                placeholder="Select Product..."
                disableOutOfStock
                showSaleInfo
              />
            </div>
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <QtyStepper value={qty} onChange={setQty} unit={pickedProduct?.unit} />
            </div>
            <div className="flex items-end">
              <Button onClick={addItem} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table className="table-global">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%] min-w-[160px]">Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className={typography("body-muted", "py-6 text-center")}>
                      No items yet. Add products above.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((i) => (
                    <TableRow key={i.productId}>
                      <TableCell className="w-[44%] min-w-[160px] font-medium">
                        <span className="item-name-cell">{i.name}</span>
                      </TableCell>
                      <TableCell className="text-right">{i.qty}</TableCell>
                      <TableCell className="text-right">{currency(i.unitPrice)}</TableCell>
                      <TableCell className="text-right">{currency(i.qty * i.unitPrice)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(i.productId)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
            <div className="text-right">
              <p className={typography("body-muted")}>Total</p>
              <p className={typography("h3")}>{currency(total)}</p>
            </div>
          </div>

          <Button onClick={checkout} className="w-full" size="lg" disabled={items.length === 0}>
            Record sale
          </Button>
        </CardContent>
      </Card>

      <Card className="form-surface shadow-soft">
        <CardHeader>
          <CardTitle>সাম্প্রতিক বিক্রি</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {sales.slice(0, 12).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <p className={typography("body-strong", "truncate")}>{s.customer}</p>
                  <p className={typography("body-muted")}>
                    {format(new Date(s.date), "MMM d, HH:mm")} · {s.items.length} item{s.items.length > 1 ? "s" : ""}
                  </p>
                </div>
                <span className={typography("body", "font-semibold")}>{currency(s.total)}</span>
              </li>
            ))}
            {sales.length === 0 && (
              <p className={typography("body-muted")}>No sales yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
