import { useState } from "react";
import { currency } from "@/lib/format";
import { isDemoMode } from "@/lib/demoMode";

/**
 * The dashboard's net-balance card.
 *  - light theme: blue card; dark theme: premium gold card (every colour has a `dark:` twin, so a
 *    `.dark` ancestor forces the gold look, which the style guide uses to show both side by side);
 *  - the card's own gradient has a fixed brighter diagonal band (centre stop); it is kept at half
 *    contrast (#0558cc light / #8e6518 dark, midway to the neighbouring stops) so it reads soft;
 *  - one glossy highlight (`.balance-sheen`, src/index.css), no static gloss: it glides slowly from the
 *    top-left corner to the bottom-right corner and loops, like light moving across a glossy card.
 */
export function BalanceCard({
  net,
  income,
  expense,
  defaultRevealed,
}: {
  net: number;
  income: number;
  expense: number;
  /** Start with the amounts visible. Defaults to visible only for the demo account. */
  defaultRevealed?: boolean;
}) {
  // Demo account: show the seeded amounts immediately (never blank/masked).
  const [revealed, setRevealed] = useState(defaultRevealed ?? isDemoMode());
  return (
    <button
      type="button"
      onClick={() => setRevealed((v) => !v)}
      aria-label={revealed ? "ব্যালেন্স লুকান" : "ব্যালেন্স দেখুন"}
      style={{ animationDelay: "50ms" }}
      className="home-hero-appear group relative flex aspect-[16/10] w-full max-w-[440px] flex-col justify-between overflow-hidden rounded-[24px] border border-brand-500/20 bg-[linear-gradient(140deg,#00091f_0%,#0a3a9e_30%,#0558cc_52%,#0a3a9e_74%,#00091f_100%)] p-4 text-left text-white transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:aspect-[1.586/1] sm:p-5 dark:border-amber-300/35 dark:bg-[linear-gradient(140deg,#0f0a02_0%,#4d3508_26%,#8e6518_50%,#7a560f_72%,#0f0a02_100%)] dark:shadow-[0_10px_34px_-10px_rgba(214,160,40,0.5)]"
    >
      {/* Glowing wave lines */}
      <svg className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden>
        <path d="M0 150 Q 50 115, 100 150 T 200 150 T 300 150 T 400 150" className="stroke-white/[0.14] dark:stroke-amber-200/[0.24]" strokeWidth="2.5" fill="none" />
        <path d="M0 185 Q 50 150, 100 185 T 200 185 T 300 185 T 400 185" className="stroke-white/[0.075] dark:stroke-amber-200/[0.14]" strokeWidth="2" fill="none" />
        <path d="M0 220 Q 50 190, 100 220 T 200 220 T 300 220 T 400 220" className="stroke-white/[0.045] dark:stroke-amber-200/[0.09]" strokeWidth="2" fill="none" />
      </svg>

      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl dark:bg-amber-200/20" aria-hidden />

      {/* The glossy highlight itself, moving: it glides slowly from the top-left corner to the
          bottom-right corner, then loops (there is no separate static gloss or second shimmer) */}
      <div className="balance-sheen" aria-hidden />

      <div className="relative flex items-start justify-between">
        {/* EMV-style chip */}
        <span className="flex h-7 w-10 items-center justify-center rounded-md bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner shadow-amber-900/40 transition-transform duration-300 group-hover:scale-105 sm:h-8 sm:w-11 dark:from-amber-100 dark:to-amber-400">
          <span className="flex flex-col gap-[3px]">
            <span className="h-px w-6 bg-amber-900/50" />
            <span className="h-px w-6 bg-amber-900/50" />
            <span className="h-px w-6 bg-amber-900/50" />
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-sm dark:bg-black/30 dark:text-amber-100">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300 dark:bg-amber-300" />
          Active
        </span>
      </div>

      <div className="relative my-auto py-1 sm:py-2">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] sm:text-[13px]">হিসাব নিকাশ</p>
          <p className="text-[10px] uppercase tracking-wider text-white/70 dark:text-amber-100/80">Net Balance · Tap</p>
        </div>
        <p className="relative mt-0.5 text-[26px] font-extrabold leading-none tracking-tight tabular-nums transition-transform duration-200 [text-shadow:0_1px_0_rgba(255,255,255,0.28),0_2px_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.25)] group-active:scale-[0.98] sm:mt-1 sm:text-[30px]">
          {revealed ? currency(net) : "৳ ••••"}
        </p>
      </div>

      {/* Income / Expense split, inline horizontal */}
      <div className="relative grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15 backdrop-blur-sm transition-colors group-hover:bg-white/15 sm:gap-2 sm:px-3 dark:bg-black/25 dark:ring-amber-200/25">
          <p className="flex items-center gap-1 text-[11px] text-white/70 dark:text-amber-100/80">
            <span aria-hidden="true" className="select-none text-xs leading-none">↗️</span> আয়
          </p>
          <p className="text-xs font-bold tabular-nums [text-shadow:0_1px_3px_rgba(0,0,0,0.3)] sm:text-sm">{revealed ? currency(income) : "৳ ••••"}</p>
        </div>
        <div className="flex items-center justify-between gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15 backdrop-blur-sm transition-colors group-hover:bg-white/15 sm:gap-2 sm:px-3 dark:bg-black/25 dark:ring-amber-200/25">
          <p className="flex items-center gap-1 text-[11px] text-white/70 dark:text-amber-100/80">
            <span aria-hidden="true" className="select-none text-xs leading-none">↙️</span> খরচ
          </p>
          <p className="text-xs font-bold tabular-nums [text-shadow:0_1px_3px_rgba(0,0,0,0.3)] sm:text-sm">{revealed ? currency(expense) : "৳ ••••"}</p>
        </div>
      </div>
    </button>
  );
}

export default BalanceCard;
