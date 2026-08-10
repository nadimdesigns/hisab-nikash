import { Product } from "@/store/shop";
import { daysUntil } from "@/lib/format";

export type StockFilter = "all" | "low" | "out" | "in";
/**
 * Expiry windows are days, not months. A pharmacy cares about stock
 * expiring within a quarter; a mudi dokan cares about milk going off
 * tomorrow, so the buckets are 3 / 7 / 30 days.
 */
export type ExpiryFilter = "all" | "expired" | "3" | "7" | "30";
export type SortKey =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc"
  | "expiry-asc"
  | "newest"
  | "oldest";

export type InventoryFilters = {
  query?: string;
  batchQuery?: string;
  category?: string;
  stockFilter?: StockFilter;
  expiryFilter?: ExpiryFilter;
  sort?: SortKey;
};

export function filterAndSortProducts(
  products: Product[],
  {
    query = "",
    batchQuery = "",
    category = "all",
    stockFilter = "all",
    expiryFilter = "all",
    sort = "name-asc",
  }: InventoryFilters,
): Product[] {
  const q = query.toLowerCase().trim();
  const bq = batchQuery.toLowerCase().trim();
  const list = products.filter((m) => {
    const matchesQuery =
      q === "" ||
      m.name.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      m.batch.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.barcode ?? "").toLowerCase().includes(q) ||
      (m.aliases ?? []).some((a) => a.toLowerCase().includes(q));
    const matchesBatch = bq === "" || m.batch.toLowerCase().includes(bq);
    const matchesCategory = category === "all" || m.category === category;

    let matchesStock = true;
    if (stockFilter === "low") matchesStock = m.stock > 0 && m.stock <= m.reorderLevel;
    else if (stockFilter === "out") matchesStock = m.stock === 0;
    else if (stockFilter === "in") matchesStock = m.stock > m.reorderLevel;

    let matchesExpiry = true;
    const days = daysUntil(m.expiry);
    if (expiryFilter === "expired") matchesExpiry = days < 0;
    else if (expiryFilter === "3") matchesExpiry = days >= 0 && days <= 3;
    else if (expiryFilter === "7") matchesExpiry = days >= 0 && days <= 7;
    else if (expiryFilter === "30") matchesExpiry = days >= 0 && days <= 30;

    return matchesQuery && matchesBatch && matchesCategory && matchesStock && matchesExpiry;
  });

  const indexById = new Map(products.map((m, i) => [m.id, i]));
  const byName = (a: Product, b: Product) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const sorted = [...list];
  switch (sort) {
    case "name-desc":
      sorted.sort((a, b) => -byName(a, b));
      break;
    case "price-asc":
      sorted.sort((a, b) => a.sellPrice - b.sellPrice || byName(a, b));
      break;
    case "price-desc":
      sorted.sort((a, b) => b.sellPrice - a.sellPrice || byName(a, b));
      break;
    case "stock-asc":
      sorted.sort((a, b) => a.stock - b.stock || byName(a, b));
      break;
    case "stock-desc":
      sorted.sort((a, b) => b.stock - a.stock || byName(a, b));
      break;
    case "expiry-asc":
      sorted.sort(
        (a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime() || byName(a, b),
      );
      break;
    case "newest":
      sorted.sort((a, b) => (indexById.get(b.id) ?? 0) - (indexById.get(a.id) ?? 0));
      break;
    case "oldest":
      sorted.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
      break;
    case "name-asc":
    default:
      sorted.sort(byName);
      break;
  }
  return sorted;
}
