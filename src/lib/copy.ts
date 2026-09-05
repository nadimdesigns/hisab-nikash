/**
 * Shared Bangla vocabulary.
 *
 * The app is Bangla-only, so there is no i18n runtime here and no message
 * keys — one-off screen copy is written directly in the JSX where it lives.
 * What belongs in this file is the vocabulary that has to stay identical
 * everywhere it appears: a unit shown in the cart, on the invoice, in the
 * stock table and in the CSV export must be the same word each time, and a
 * payment status must read the same on a badge as in a filter.
 */

export const APP_NAME = "হিসাব নিকাশ";
export const APP_TAGLINE = "মুদি দোকানের হিসাব";

/**
 * Units a mudi dokan actually sells in.
 *
 * `step` is the smallest increment the quantity stepper offers for that
 * unit — rice and lentils are scooped out in quarter-kilos, but nobody
 * sells a third of an egg. `decimal` marks the units where a fractional
 * quantity is meaningful at all; the rest are clamped to whole numbers.
 */
export type UnitCode =
  | "kg"
  | "gram"
  | "litre"
  | "ml"
  | "piece"
  | "dozen"
  | "hali"
  | "bosta"
  | "packet";

export type UnitDef = {
  code: UnitCode;
  label: string;
  step: number;
  decimal: boolean;
};

export const UNITS: readonly UnitDef[] = [
  { code: "kg", label: "কেজি", step: 0.25, decimal: true },
  { code: "gram", label: "গ্রাম", step: 50, decimal: false },
  { code: "litre", label: "লিটার", step: 0.5, decimal: true },
  { code: "ml", label: "মিলি", step: 100, decimal: false },
  { code: "piece", label: "পিস", step: 1, decimal: false },
  { code: "dozen", label: "ডজন", step: 1, decimal: false },
  { code: "hali", label: "হালি", step: 1, decimal: false },
  { code: "bosta", label: "বস্তা", step: 1, decimal: false },
  { code: "packet", label: "প্যাকেট", step: 1, decimal: false },
] as const;

export const DEFAULT_UNIT: UnitCode = "piece";

const UNIT_BY_CODE = new Map<string, UnitDef>(UNITS.map((u) => [u.code, u]));

/** Falls back to পিস for unknown or missing codes so older rows still render. */
export const unitDef = (code: string | undefined): UnitDef =>
  UNIT_BY_CODE.get(code ?? "") ?? UNIT_BY_CODE.get(DEFAULT_UNIT)!;

export const unitLabel = (code: string | undefined): string => unitDef(code).label;

/** Payment state of a sale. Mirrors `PaymentStatus` in the shop store. */
export const PAYMENT_STATUS: Record<"paid" | "partial" | "unpaid", string> = {
  paid: "পরিশোধিত",
  partial: "আংশিক",
  unpaid: "বাকি",
};

/** How money changed hands. Recording only — no payment API is involved. */
export type PaymentMethod = "cash" | "bkash" | "nagad" | "rocket";

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: "নগদ",
  bkash: "বিকাশ",
  nagad: "নগদ (Nagad)",
  rocket: "রকেট",
};

/** Navigation labels, shared between the desktop sidebar and mobile nav. */
export const NAV = {
  dashboard: "হোম",
  stocks: "স্টক",
  sales: "বিক্রি",
  customers: "কাস্টমার",
  suppliers: "পাইকার",
  purchases: "ক্রয়",
  expenses: "খরচ",
  accounting: "হিসাব",
  khata: "বাকি খাতা",
  settings: "সেটিংস",
  account: "অ্যাকাউন্ট",
  styleGuide: "স্টাইল গাইড",
  workspace: "কাজের জায়গা",
} as const;

/** Verbs and nouns repeated across forms, dialogs and toasts. */
export const ACTION = {
  add: "যোগ করুন",
  edit: "সম্পাদনা",
  save: "সংরক্ষণ",
  cancel: "বাতিল",
  delete: "মুছুন",
  search: "খুঁজুন",
  total: "মোট",
  cashSale: "নগদ বিক্রি",
  dueSale: "বাকি বিক্রি",
  newCustomer: "নতুন কাস্টমার",
  newPurchase: "নতুন ক্রয়",
  receivePayment: "টাকা গ্রহণ",
  quantity: "পরিমাণ",
  price: "দাম",
  stock: "স্টক",
  lot: "লট",
  expiry: "মেয়াদ",
  due: "বাকি",
  paid: "পরিশোধিত",
} as const;
