import { beforeEach, describe, expect, it } from "vitest";
import { filterAndSortProducts } from "@/lib/inventoryFilters";
import { useShop, type Product } from "@/store/shop";

const base = (name: string): Omit<Product, "id"> => ({
  name, sku: name, category: "চা", unit: "piece", batch: "", expiry: "2030-01-01",
  stock: 5, reorderLevel: 1, costPrice: 1, sellPrice: 2,
});

describe("product order: most recently added or edited first", () => {
  beforeEach(() => useShop.setState({ products: [], sales: [], purchases: [] }));

  it("a new product goes to the top of the default (newest) listing", () => {
    useShop.getState().addProduct(base("A"));
    useShop.getState().addProduct(base("B"));
    const names = filterAndSortProducts(useShop.getState().products, { sort: "newest" }).map((p) => p.name);
    expect(names).toEqual(["B", "A"]);
  });

  it("an edited product moves to the top", () => {
    useShop.getState().addProduct(base("A"));
    useShop.getState().addProduct(base("B"));
    const a = useShop.getState().products.find((p) => p.name === "A")!;
    useShop.getState().updateProduct(a.id, { sellPrice: 9 });
    const list = filterAndSortProducts(useShop.getState().products, { sort: "newest" });
    expect(list.map((p) => p.name)).toEqual(["A", "B"]);
    expect(list[0].sellPrice).toBe(9);
    expect(useShop.getState().products).toHaveLength(2);
  });
});
