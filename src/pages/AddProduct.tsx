import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DEFAULT_UNIT, UNITS, type UnitCode } from "@/lib/copy";
import { Product, useShop, useShopHydrated } from "@/store/shop";
import { generateSku } from "@/lib/sku";
import { toast } from "@/hooks/use-toast";
import { Field, ImageUploadField } from "@/components/inventory/InventoryPanel";

const NEW_CATEGORY_VALUE = "__new_category__";

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

export default function AddProduct() {
  const navigate = useNavigate();
  const { products, addProduct } = useShop();
  const hydrated = useShopHydrated();
  const [form, setForm] = useState<Omit<Product, "id">>(empty);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // SKU is auto-generated, not typed by the user, so it can only be computed
  // once the persisted product list has actually loaded — generating it
  // against the pre-hydration default state could hand out a SKU that
  // collides with a real product as soon as hydration finishes.
  useEffect(() => {
    if (hydrated) {
      setForm((f) => ({ ...f, sku: generateSku(products) }));
    }
    // Only recompute right when hydration completes, not on every products
    // change, so the SKU stays fixed while the user fills in the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "bn"));
  }, [products]);

  const categoryConflict = useMemo(() => {
    const v = newCategory.trim().toLowerCase();
    if (!v) return false;
    return existingCategories.some((c) => c.toLowerCase() === v);
  }, [newCategory, existingCategories]);

  const submit = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      toast({ title: "Name and SKU are required", variant: "destructive" });
      return;
    }
    if (addingCategory && categoryConflict) {
      toast({
        title: "Category already exists",
        description: "Pick it from the list instead of adding it again.",
        variant: "destructive",
      });
      return;
    }
    if (form.sellPrice < form.costPrice) {
      toast({ title: "Sell price is below cost price", description: "Double-check pricing before saving." });
    }
    addProduct(form);
    toast({ title: "Product added" });
    navigate("/stocks");
  };

  return (
    <AppLayout title="Add product">
      <div className="mb-4">
        <Button variant="ghost" asChild className="gap-2 px-2">
          <Link to="/stocks">
            <ArrowLeft className="h-4 w-4" /> Back to Stocks
          </Link>
        </Button>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Product image" className="sm:col-span-2">
              <ImageUploadField
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                productName={form.name}
              />
            </Field>
            <Field label="Name" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <Input
                value={hydrated ? form.sku : "Generating…"}
                disabled
                readOnly
                className="disabled:opacity-100"
              />
              <p className="text-xs text-muted-foreground">Auto-generated and always unique — can't be edited.</p>
            </Field>
            <Field label="Category">
              {addingCategory ? (
                <div className="space-y-1.5">
                  <Input
                    autoFocus
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      setForm({ ...form, category: e.target.value });
                    }}
                    placeholder="New category name"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {categoryConflict ? (
                      <p className="text-xs text-destructive">Already exists — pick it from the list.</p>
                    ) : <span />}
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2"
                      onClick={() => {
                        setAddingCategory(false);
                        setNewCategory("");
                        setForm({ ...form, category: "" });
                      }}
                    >
                      Choose from existing
                    </button>
                  </div>
                </div>
              ) : (
                <Select
                  value={form.category}
                  onValueChange={(v) => {
                    if (v === NEW_CATEGORY_VALUE) {
                      setAddingCategory(true);
                      setNewCategory("");
                      setForm({ ...form, category: "" });
                    } else {
                      setForm({ ...form, category: v });
                    }
                  }}
                >
                  <SelectTrigger aria-label="Category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_CATEGORY_VALUE} className="font-medium text-primary">
                      <span className="inline-flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add category
                      </span>
                    </SelectItem>
                    {existingCategories.length > 0 && <SelectSeparator />}
                    {existingCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            <Field label="Barcode / UPN" className="sm:col-span-2">
              <Input
                value={form.barcode ?? ""}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="Scan or paste a barcode (optional)"
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
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
            <Field label="Cost price">
              <Input type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
            </Field>
            <Field label="Sell price">
              <Input type="number" min={0} step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" asChild className="sm:w-auto">
              <Link to="/stocks">Cancel</Link>
            </Button>
            <Button onClick={submit} className="sm:w-auto">Add</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
