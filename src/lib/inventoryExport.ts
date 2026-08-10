import { Product } from "@/store/shop";
import { bnNumber, currency, daysUntil, formatDate } from "@/lib/format";
import { unitLabel } from "@/lib/copy";
import { printReport } from "@/lib/printReport";

const today = () => new Date().toISOString().slice(0, 10);

const escapeCsv = (v: string | number) => {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const expiryStatus = (expiry: string) => {
  const d = daysUntil(expiry);
  if (d < 0) return "Expired";
  if (d <= 30) return `${d}d (≤30d)`;
  if (d <= 60) return `${d}d (≤60d)`;
  if (d <= 90) return `${d}d (≤90d)`;
  return `${d}d`;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export function exportInventoryCSV(products: Product[]) {
  const headers = [
    "Name",
    "SKU",
    "Category",
    "Batch / Lot",
    "Expiry",
    "Days to Expiry",
    "Status",
    "Stock",
    "Unit",
    "Reorder Level",
    "Cost Price",
    "Sell Price",
    "Estimated Value (Cost)",
    "Estimated Value (Sell)",
  ];
  const rows = products.map((m) => [
    m.name,
    m.sku,
    m.category,
    m.batch,
    m.expiry,
    String(daysUntil(m.expiry)),
    expiryStatus(m.expiry),
    String(m.stock),
    unitLabel(m.unit),
    String(m.reorderLevel),
    m.costPrice.toFixed(2),
    m.sellPrice.toFixed(2),
    (m.stock * m.costPrice).toFixed(2),
    (m.stock * m.sellPrice).toFixed(2),
  ]);

  const totalCost = products.reduce((s, m) => s + m.stock * m.costPrice, 0);
  const totalSell = products.reduce((s, m) => s + m.stock * m.sellPrice, 0);
  const totalUnits = products.reduce((s, m) => s + m.stock, 0);

  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(","));
  rows.forEach((r) => lines.push(r.map(escapeCsv).join(",")));
  lines.push("");
  lines.push(["", "", "", "", "", "", "Totals", String(totalUnits), "", "", "", totalCost.toFixed(2), totalSell.toFixed(2)].map(escapeCsv).join(","));
  lines.push(`# Generated,${today()}`);
  lines.push(`# Items,${products.length}`);

  // Excel assumes the platform codepage unless a UTF-8 BOM says otherwise,
  // which would render every Bengali name as mojibake.
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `HisabNikash-stock-report-${today()}.csv`);
}

export function exportInventoryPDF(products: Product[]) {
  const totalCost = products.reduce((s, m) => s + m.stock * m.costPrice, 0);
  const totalSell = products.reduce((s, m) => s + m.stock * m.sellPrice, 0);
  const totalUnits = products.reduce((s, m) => s + m.stock, 0);
  const lowStock = products.filter((m) => m.stock <= m.reorderLevel).length;
  const expiringSoon = products.filter((m) => {
    const d = daysUntil(m.expiry);
    return d >= 0 && d <= 7;
  }).length;

  printReport({
    title: "স্টক রিপোর্ট",
    summary: [
      `তৈরি: ${formatDate(new Date(), "dd MMM yyyy, h:mm a")} · মোট পণ্য: ${bnNumber(products.length)}`,
      `মোট একক: ${bnNumber(totalUnits)} · ক্রয়মূল্যে: ${currency(totalCost)} · বিক্রয়মূল্যে: ${currency(totalSell)}`,
      `কম স্টক: ${bnNumber(lowStock)} · ৭ দিনে মেয়াদ শেষ: ${bnNumber(expiringSoon)}`,
    ],
    columns: [
      { header: "পণ্য" },
      { header: "SKU" },
      { header: "ক্যাটাগরি" },
      { header: "লট" },
      { header: "মেয়াদ" },
      { header: "অবস্থা" },
      { header: "স্টক", align: "right" },
      { header: "একক" },
      { header: "রিঅর্ডার", align: "right" },
      { header: "ক্রয়মূল্য", align: "right" },
      { header: "বিক্রয়মূল্য", align: "right" },
      { header: "মোট (ক্রয়)", align: "right" },
      { header: "মোট (বিক্রয়)", align: "right" },
    ],
    rows: products.map((m) => [
      m.name,
      m.sku,
      m.category,
      m.batch,
      m.expiry ? formatDate(m.expiry) : "",
      expiryStatus(m.expiry),
      bnNumber(m.stock),
      unitLabel(m.unit),
      bnNumber(m.reorderLevel),
      currency(m.costPrice),
      currency(m.sellPrice),
      currency(m.stock * m.costPrice),
      currency(m.stock * m.sellPrice),
    ]),
    footer: [
      "মোট", "", "", "", "", "",
      bnNumber(totalUnits), "", "", "", "",
      currency(totalCost),
      currency(totalSell),
    ],
  });
}
