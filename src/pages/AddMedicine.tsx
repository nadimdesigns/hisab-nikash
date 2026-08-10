import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Medicine, useShop } from "@/store/shop";
import { toast } from "@/hooks/use-toast";
import { Field, ImageUploadField } from "@/components/inventory/InventoryPanel";

const empty: Omit<Medicine, "id"> = {
  name: "",
  sku: "",
  category: "",
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

export default function AddMedicine() {
  const navigate = useNavigate();
  const { addMedicine } = useShop();
  const [form, setForm] = useState<Omit<Medicine, "id">>(empty);

  const submit = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      toast({ title: "Name and SKU are required", variant: "destructive" });
      return;
    }
    if (form.sellPrice < form.costPrice) {
      toast({ title: "Sell price is below cost price", description: "Double-check pricing before saving." });
    }
    addMedicine(form);
    toast({ title: "Medicine added" });
    navigate("/stocks");
  };

  return (
    <AppLayout title="Add medicine">
      <div className="mb-4">
        <Button variant="ghost" asChild className="gap-2 px-2">
          <Link to="/stocks">
            <ArrowLeft className="h-4 w-4" /> Back to Stocks
          </Link>
        </Button>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product image" className="col-span-2">
              <ImageUploadField
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                productName={form.name}
              />
            </Field>
            <Field label="Name" className="col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Batch">
              <Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
            </Field>
            <Field label="Barcode / UPN" className="col-span-2">
              <Input
                value={form.barcode ?? ""}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="Scan or paste a barcode (optional)"
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
                placeholder="e.g. Paracetamol, Acetaminophen, Tylenol"
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
                      "w-full justify-start text-left font-normal overflow-hidden",
                      !form.expiry && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-[3px] h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate">
                      {form.expiry ? formatDate(parseISO(form.expiry), "MMM do, yyyy") : "Pick a date"}
                    </span>
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
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" asChild>
              <Link to="/stocks">Cancel</Link>
            </Button>
            <Button onClick={submit}>Add</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
