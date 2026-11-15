import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { currency } from "@/lib/format";
import type { Product } from "@/store/shop";
import { typography } from "@/lib/typography";

type Props = {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** When true, items with stock===0 are not selectable. */
  disableOutOfStock?: boolean;
  /** When true, shows price + stock info beside the name. */
  showSaleInfo?: boolean;
  className?: string;
};

export function ProductPickerSheet({
  products,
  value,
  onChange,
  placeholder = "Select Product...",
  disableOutOfStock = false,
  showSaleInfo = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = products.find((m) => m.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((m) => m.name.toLowerCase().includes(q));
  }, [products, query]);

  const handlePick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-12 w-full justify-between px-3 py-2 text-foreground md:h-10",
            "text-[15px] leading-[22px] md:text-base md:leading-6 font-normal capitalize",
            !selected && "text-[#bbbbbb] dark:text-white",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#bbbbbb]" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[80svh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl p-0 sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="-mt-1 flex-1 overflow-y-auto px-3 pb-6">
          {filtered.length === 0 ? (
            <p className={typography("body-muted", "py-6 text-center")}>
              No products found.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((m) => {
                const disabled = disableOutOfStock && m.stock === 0;
                const isSelected = m.id === value;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handlePick(m.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
                        isSelected && "bg-accent",
                        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {m.name}
                      </span>
                      {showSaleInfo && (
                        <span className={typography("body-muted", "shrink-0 tabular-nums")}>
                          {currency(m.sellPrice)} · {m.stock} left
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductPickerSheet;
