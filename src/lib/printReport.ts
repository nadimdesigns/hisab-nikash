/**
 * PDF export by way of the browser's own print engine.
 *
 * The obvious approach — jsPDF with an embedded Bengali TTF — does not work,
 * and fails in a way that matters. jsPDF has no OpenType shaping engine: it
 * maps codepoints to glyphs in order, so Bengali comes out wrong even with
 * the correct font loaded. Measured against Hind Siliguri embedded as a TTF:
 *
 *   মিনিকেট  →  মনিকেট        (pre-base vowel ি placed after its consonant)
 *   রিপোর্ট   →  রিপাের্ট + ◌   (ো decomposed, dotted-circle placeholder)
 *   ৳১,২৩,৪৫,৬৭৮ → ৳১          (everything after the first comma dropped)
 *
 * That last one is disqualifying on its own — a stock report that silently
 * turns ৳1.2 crore into ৳1 is worse than no report.
 *
 * The browser already shapes Bengali correctly for the screen, so printing
 * reuses that: build a plain HTML document, drop it in a hidden iframe, and
 * call print(). The user picks "Save as PDF" in the print dialog. Output is
 * real selectable text rather than a rasterised image, it costs no extra
 * bundle weight, and it works with the network down.
 */

const escapeHtml = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type PrintColumn = {
  header: string;
  /** Right-align numeric columns so figures line up down the page. */
  align?: "left" | "right";
};

export type PrintReport = {
  title: string;
  /** Short lines under the title — totals, filters, generation time. */
  summary?: string[];
  columns: PrintColumn[];
  rows: (string | number)[][];
  /** Optional bold row rendered in a <tfoot>. */
  footer?: (string | number)[];
};

const styles = `
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  /* Outfit first so Latin (SKUs, dates) matches the app, Hind Siliguri
     behind it for every Bengali glyph — the same stack the screen uses. */
  html, body {
    font-family: 'Outfit', 'Hind Siliguri', system-ui, sans-serif;
    color: #111827;
    background: #fff;
    margin: 0;
    font-size: 12px;
  }
  h1 { font-size: 18px; margin: 0 0 4px; font-weight: 600; }
  .summary { font-size: 11px; color: #4b5563; margin: 0 0 12px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead th {
    background: #1f4e78; color: #fff; text-align: left;
    padding: 6px 8px; font-weight: 600;
  }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tfoot td { padding: 6px 8px; font-weight: 600; background: #f1f5f9; }
  .r { text-align: right; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
`;

const buildHtml = ({ title, summary = [], columns, rows, footer }: PrintReport): string => {
  const head = columns
    .map((c) => `<th class="${c.align === "right" ? "r" : ""}">${escapeHtml(c.header)}</th>`)
    .join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (cell, i) =>
              `<td class="${columns[i]?.align === "right" ? "r" : ""}">${escapeHtml(cell)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const foot = footer
    ? `<tfoot><tr>${footer
        .map(
          (cell, i) =>
            `<td class="${columns[i]?.align === "right" ? "r" : ""}">${escapeHtml(cell)}</td>`,
        )
        .join("")}</tr></tfoot>`
    : "";

  // No <style> here on purpose — the app's stylesheets are cloned in after
  // this document is written (for the @font-face rules), and the print rules
  // are appended last so they win over Tailwind's base layer.
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="summary">${summary.map(escapeHtml).join("<br>")}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>
</body></html>`;
};

/**
 * Copy the host page's stylesheets into the print document.
 *
 * An iframe written with document.write gets a fresh document with its own
 * empty font set — @font-face rules are per-document, so "Hind Siliguri"
 * would resolve to nothing and the report would silently fall back to
 * whatever system-ui happens to be (no Bengali at all on a stock Windows
 * install). Cloning the parent's <link> and <style> nodes brings the
 * bundled @font-face declarations along. The files themselves are already
 * in the browser cache, so this costs no network and still works offline.
 */
const cloneStyles = (target: Document): void => {
  document.head
    .querySelectorAll('link[rel="stylesheet"], style')
    .forEach((node) => target.head.appendChild(node.cloneNode(true)));
};

/**
 * Render a report and open the print dialog.
 *
 * Uses a hidden same-origin iframe rather than window.open, which mobile
 * browsers routinely block.
 */
export function printReport(report: PrintReport): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    // Deferred: removing the iframe while the print dialog is still reading
    // from it cancels the job in some browsers.
    window.setTimeout(() => iframe.remove(), 1000);
  };

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("প্রিন্ট উইন্ডো খোলা যায়নি");
  }

  doc.open();
  doc.write(buildHtml(report));
  doc.close();

  cloneStyles(doc);
  const printCss = doc.createElement("style");
  printCss.textContent = styles;
  doc.head.appendChild(printCss);

  const run = () => {
    win.focus();
    win.print();
    cleanup();
  };

  // Fonts must be resolved before print() or the first page can lay out with
  // a fallback face and reflow mid-job.
  if (doc.fonts?.ready) {
    doc.fonts.ready.then(run).catch(run);
  } else {
    win.setTimeout(run, 100);
  }
}
