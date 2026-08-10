import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/store/shop";
import { daysUntil } from "@/lib/format";

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

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `HisabNikash-stock-report-${today()}.csv`);
}

export function exportInventoryPDF(products: Product[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Inventory Report", 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
  doc.text(`Items: ${products.length}`, pageWidth - 40, 58, { align: "right" });

  const totalCost = products.reduce((s, m) => s + m.stock * m.costPrice, 0);
  const totalSell = products.reduce((s, m) => s + m.stock * m.sellPrice, 0);
  const totalUnits = products.reduce((s, m) => s + m.stock, 0);
  const lowStock = products.filter((m) => m.stock <= m.reorderLevel).length;
  const expiringSoon = products.filter((m) => {
    const d = daysUntil(m.expiry);
    return d >= 0 && d <= 60;
  }).length;

  doc.setFontSize(9);
  doc.text(
    `Total units: ${totalUnits}   |   Est. value (cost): ${totalCost.toFixed(2)}   |   Est. value (sell): ${totalSell.toFixed(2)}   |   Low stock: ${lowStock}   |   Expiring ≤60d: ${expiringSoon}`,
    40,
    74,
  );

  autoTable(doc, {
    startY: 90,
    head: [
      [
        "Name",
        "SKU",
        "Category",
        "Batch",
        "Expiry",
        "Status",
        "Stock",
        "Reorder",
        "Cost",
        "Sell",
        "Value (Cost)",
        "Value (Sell)",
      ],
    ],
    body: products.map((m) => [
      m.name,
      m.sku,
      m.category,
      m.batch,
      m.expiry,
      expiryStatus(m.expiry),
      m.stock,
      m.reorderLevel,
      m.costPrice.toFixed(2),
      m.sellPrice.toFixed(2),
      (m.stock * m.costPrice).toFixed(2),
      (m.stock * m.sellPrice).toFixed(2),
    ]),
    foot: [
      [
        { content: "Totals", colSpan: 6, styles: { halign: "right", fontStyle: "bold" } },
        { content: String(totalUnits), styles: { fontStyle: "bold" } },
        "",
        "",
        "",
        { content: totalCost.toFixed(2), styles: { fontStyle: "bold" } },
        { content: totalSell.toFixed(2), styles: { fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [31, 78, 120], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 20 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 65 },
      2: { cellWidth: 70 },
      3: { cellWidth: 55 },
      4: { cellWidth: 60 },
      5: { cellWidth: 60 },
      6: { cellWidth: 40, halign: "right" },
      7: { cellWidth: 45, halign: "right" },
      8: { cellWidth: 45, halign: "right" },
      9: { cellWidth: 45, halign: "right" },
      10: { cellWidth: 65, halign: "right" },
      11: { cellWidth: 65, halign: "right" },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 40,
        pageHeight - 20,
        { align: "right" },
      );
      doc.setTextColor(0);
    },
  });

  doc.save(`HisabNikash-stock-report-${today()}.pdf`);
}
