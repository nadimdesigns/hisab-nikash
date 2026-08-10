import type { Product } from "@/store/shop";

/**
 * Generates a SKU guaranteed not to collide with any existing product.
 * Sequential (PRD-0001, PRD-0002, ...) rather than derived from the name —
 * product names and categories are mostly Bangla script, so there is no
 * clean latin-prefix to slug into a SKU.
 */
export function generateSku(existing: Product[]): string {
  const used = new Set(existing.map((p) => p.sku.trim().toUpperCase()));
  let n = existing.length + 1;
  let sku = `PRD-${String(n).padStart(4, "0")}`;
  while (used.has(sku)) {
    n += 1;
    sku = `PRD-${String(n).padStart(4, "0")}`;
  }
  return sku;
}
