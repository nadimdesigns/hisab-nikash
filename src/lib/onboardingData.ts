import { type UnitCode } from "@/lib/copy";
import { scopedKey } from "@/lib/accountScope";

export type ShopType = "grocery" | "pharmacy" | "tea_stall" | "raw_market" | "service" | "other";

export type OnboardingProductTemplate = {
  id: string;
  name: string;
  category: string;
  unit: UnitCode;
  costPrice: number;
  sellPrice: number;
  initialStock: number;
  reorderLevel: number;
};

export type ShopTypeInfo = {
  id: ShopType;
  title: string;
  shortTitle: string;
  emoji: string;
  description: string;
};

export const ONBOARDING_SHOP_TYPES: readonly ShopTypeInfo[] = [
  {
    id: "grocery",
    title: "মুদি / ভ্যারাইটিজ স্টোর",
    shortTitle: "মুদি দোকান",
    emoji: "🛒",
    description: "চাল, ডাল, তেল, চিনি, আটা, মসলা ও নিত্যপ্রয়োজনীয় মুদি পণ্য",
  },
  {
    id: "pharmacy",
    title: "ফার্মেসী",
    shortTitle: "ফার্মেসী",
    emoji: "💊",
    description: "ট্যাবলেট, ক্যাপসুল, সিরাপ, স্যালাইন ও জরুরি ফার্স্ট এইড ওষুধ",
  },
  {
    id: "tea_stall",
    title: "টি স্টোর",
    shortTitle: "টি স্টোর",
    emoji: "☕",
    description: "দুধ চা, লাল চা, কফি, বিস্কুট, কেক, বনরুটি ও হালকা নাশতা",
  },
  {
    id: "raw_market",
    title: "কাঁচা বাজার",
    shortTitle: "কাঁচা বাজার",
    emoji: "🥬",
    description: "শাকসবজি, আলু, পেঁয়াজ, তাজা মাছ, ব্রয়লার ও দেশি মুরগি",
  },
  {
    id: "service",
    title: "সেবাদান ব্যবসা",
    shortTitle: "সেবা ব্যবসা",
    emoji: "🛠️",
    description: "ডেন্টাল, পার্লার, ইলেকট্রিক, এসি, পরিবহন ও নানা সেবা",
  },
  {
    id: "other",
    title: "অন্যান্য",
    shortTitle: "অন্যান্য দোকান",
    emoji: "🏪",
    description: "স্টেশনারি, ইলেকট্রনিক্স, উপহার সামগ্রী বা যেকোনো খুচরা দোকান",
  },
] as const;

export type ServiceBusinessType = {
  id: string;
  title: string;
  emoji: string;
  defaultItems: OnboardingProductTemplate[];
};

export const SERVICE_BUSINESS_TYPES: readonly ServiceBusinessType[] = [
  {
    id: "srv-dental",
    title: "ডেন্টাল / স্বাস্থ্যসেবা",
    emoji: "🩺",
    defaultItems: [
      { id: "srv-d-consult", name: "ডাক্তার কনসালটেশন / ভিজিট", category: "স্বাস্থ্যসেবা", unit: "piece", costPrice: 100, sellPrice: 500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-d-scale", name: "ডেন্টাল স্কেলিং ও ক্লিনিং", category: "ডেন্টাল", unit: "piece", costPrice: 300, sellPrice: 1200, initialStock: 999, reorderLevel: 5 },
      { id: "srv-d-fill", name: "দাঁত ফিলিং ও ট্রিটমেন্ট", category: "ডেন্টাল", unit: "piece", costPrice: 400, sellPrice: 1500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-d-extract", name: "দাঁত তোলা / এক্সট্রাকশন", category: "ডেন্টাল", unit: "piece", costPrice: 200, sellPrice: 800, initialStock: 999, reorderLevel: 5 },
    ],
  },
  {
    id: "srv-salon",
    title: "সেলুন / পার্লার",
    emoji: "✂️",
    defaultItems: [
      { id: "srv-s-haircut", name: "চুল কাটা / হেয়ারকাট", category: "হেয়ারকেয়ার", unit: "piece", costPrice: 20, sellPrice: 120, initialStock: 999, reorderLevel: 5 },
      { id: "srv-s-shave", name: "দাড়ি কাটা / শেভিং", category: "শেভিং", unit: "piece", costPrice: 15, sellPrice: 60, initialStock: 999, reorderLevel: 5 },
      { id: "srv-s-facial", name: "ফেসিয়াল / স্কিন ট্রিটমেন্ট", category: "স্কিনকেয়ার", unit: "piece", costPrice: 150, sellPrice: 500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-s-spa", name: "হেয়ার স্পা ও কালার", category: "স্পা", unit: "piece", costPrice: 200, sellPrice: 700, initialStock: 999, reorderLevel: 5 },
    ],
  },
  {
    id: "srv-electric",
    title: "ইলেকট্রিক সার্ভিস",
    emoji: "⚡",
    defaultItems: [
      { id: "srv-e-fan", name: "ফ্যান সার্ভিসিং ও ওয়্যারিং", category: "ইলেকট্রিক", unit: "piece", costPrice: 50, sellPrice: 300, initialStock: 999, reorderLevel: 5 },
      { id: "srv-e-switch", name: "সুইচ ও বোর্ড মেরামত", category: "ইলেকট্রিক", unit: "piece", costPrice: 40, sellPrice: 200, initialStock: 999, reorderLevel: 5 },
      { id: "srv-e-motor", name: "পানির মোটর মেরামত ও সার্ভিস", category: "মোটর", unit: "piece", costPrice: 200, sellPrice: 800, initialStock: 999, reorderLevel: 5 },
      { id: "srv-e-light", name: "লাইট ফিটিং ও মেরামত", category: "ইলেকট্রিক", unit: "piece", costPrice: 50, sellPrice: 250, initialStock: 999, reorderLevel: 5 },
    ],
  },
  {
    id: "srv-ac",
    title: "এসি সার্ভিস",
    emoji: "❄️",
    defaultItems: [
      { id: "srv-ac-wash", name: "এসি বেসিক ওয়াশ / সার্ভিস", category: "এসি সার্ভিস", unit: "piece", costPrice: 200, sellPrice: 800, initialStock: 999, reorderLevel: 5 },
      { id: "srv-ac-master", name: "এসি মাস্টার সার্ভিসিং", category: "এসি সার্ভিস", unit: "piece", costPrice: 350, sellPrice: 1500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-ac-gas", name: "এসি গ্যাস রিফিলিং", category: "এসি মেরামত", unit: "piece", costPrice: 1000, sellPrice: 2500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-ac-install", name: "এসি ইনস্টলেশন / শিফটিং", category: "এসি ইনস্টলেশন", unit: "piece", costPrice: 500, sellPrice: 2000, initialStock: 999, reorderLevel: 5 },
    ],
  },
  {
    id: "srv-transport",
    title: "পরিবহন সেবা",
    emoji: "🚗",
    defaultItems: [
      { id: "srv-t-trip", name: "লোকাল ট্রিপ ভাড়া", category: "ট্রান্সপোর্ট", unit: "piece", costPrice: 500, sellPrice: 1200, initialStock: 999, reorderLevel: 5 },
      { id: "srv-t-day", name: "দিনব্যাপী গাড়ি রিজার্ভ", category: "রিজার্ভ", unit: "piece", costPrice: 1500, sellPrice: 3500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-t-goods", name: "পণ্য পরিবহন সেবা", category: "পরিবহন", unit: "piece", costPrice: 800, sellPrice: 2000, initialStock: 999, reorderLevel: 5 },
      { id: "srv-t-parcel", name: "পার্সেল পিক অ্যান্ড ড্রপ", category: "ডেলিভারি", unit: "piece", costPrice: 50, sellPrice: 150, initialStock: 999, reorderLevel: 5 },
    ],
  },
  {
    id: "srv-digital",
    title: "ডিজিটাল সেবা",
    emoji: "💻",
    defaultItems: [
      { id: "srv-dig-form", name: "অনলাইন আবেদন ও ফরম পূরণ", category: "ডিজিটাল", unit: "piece", costPrice: 15, sellPrice: 100, initialStock: 999, reorderLevel: 5 },
      { id: "srv-dig-print", name: "কম্পিউটার প্রিন্ট ও ফটোকপি", category: "প্রিন্টিং", unit: "piece", costPrice: 5, sellPrice: 20, initialStock: 999, reorderLevel: 5 },
      { id: "srv-dig-photo", name: "পাসপোর্ট সাইজ ছবি প্রিন্ট", category: "ছবি", unit: "piece", costPrice: 20, sellPrice: 80, initialStock: 999, reorderLevel: 5 },
      { id: "srv-dig-type", name: "টাইপিং ও ডকুমেন্ট কম্পোজ", category: "কম্পোজ", unit: "piece", costPrice: 30, sellPrice: 150, initialStock: 999, reorderLevel: 5 },
    ],
  },
  {
    id: "srv-consult",
    title: "কন্সালটেন্সি",
    emoji: "📋",
    defaultItems: [
      { id: "srv-c-initial", name: "প্রাথমিক পরামর্শ ও অডিট", category: "পরামর্শ", unit: "piece", costPrice: 200, sellPrice: 1000, initialStock: 999, reorderLevel: 5 },
      { id: "srv-c-doc", name: "কাগজপত্র যাচাই ও ফাইল তৈরি", category: "ডকুমেন্টেশন", unit: "piece", costPrice: 500, sellPrice: 2500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-c-full", name: "ফুল প্রজেক্ট কনসালটেশন ফি", category: "কনসালটেশন", unit: "piece", costPrice: 1500, sellPrice: 5000, initialStock: 999, reorderLevel: 5 },
    ],
  },
  {
    id: "srv-other",
    title: "অন্যান্য",
    emoji: "🤝",
    defaultItems: [
      { id: "srv-o-charge", name: "সাধারণ সেবা ফি", category: "সেবা চার্জ", unit: "piece", costPrice: 100, sellPrice: 500, initialStock: 999, reorderLevel: 5 },
      { id: "srv-o-visit", name: "ভিজিট ও পরিদর্শন চার্জ", category: "পরিদর্শন", unit: "piece", costPrice: 80, sellPrice: 300, initialStock: 999, reorderLevel: 5 },
      { id: "srv-o-repair", name: "মেরামত ও টেকনিক্যাল সার্ভিস", category: "মেরামত", unit: "piece", costPrice: 250, sellPrice: 1000, initialStock: 999, reorderLevel: 5 },
    ],
  },
] as const;

export const SHOP_TYPE_PRODUCTS: Record<ShopType, OnboardingProductTemplate[]> = {
  grocery: [
    { id: "g-chal-mini", name: "মিনিকেট চাল", category: "চাল", unit: "kg", costPrice: 68, sellPrice: 76, initialStock: 250, reorderLevel: 50 },
    { id: "g-chal-nazir", name: "নাজিরশাইল চাল", category: "চাল", unit: "kg", costPrice: 78, sellPrice: 88, initialStock: 150, reorderLevel: 30 },
    { id: "g-dal-mosur", name: "মসুর ডাল", category: "ডাল", unit: "kg", costPrice: 105, sellPrice: 120, initialStock: 80, reorderLevel: 20 },
    { id: "g-dal-mug", name: "মুগ ডাল", category: "ডাল", unit: "kg", costPrice: 132, sellPrice: 150, initialStock: 45, reorderLevel: 15 },
    { id: "g-tel-soya", name: "সয়াবিন তেল ১ লিটার", category: "তেল", unit: "litre", costPrice: 165, sellPrice: 178, initialStock: 60, reorderLevel: 20 },
    { id: "g-tel-shor", name: "সরিষার তেল ৫০০ মিলি", category: "তেল", unit: "packet", costPrice: 145, sellPrice: 165, initialStock: 30, reorderLevel: 10 },
    { id: "g-chini", name: "চিনি", category: "চিনি ও লবণ", unit: "kg", costPrice: 115, sellPrice: 128, initialStock: 100, reorderLevel: 25 },
    { id: "g-lobon", name: "লবণ ১ কেজি", category: "চিনি ও লবণ", unit: "packet", costPrice: 36, sellPrice: 42, initialStock: 80, reorderLevel: 25 },
    { id: "g-ata", name: "আটা", category: "আটা ও ময়দা", unit: "kg", costPrice: 45, sellPrice: 53, initialStock: 120, reorderLevel: 30 },
    { id: "g-moyda", name: "ময়দা", category: "আটা ও ময়দা", unit: "kg", costPrice: 55, sellPrice: 64, initialStock: 60, reorderLevel: 20 },
    { id: "g-dim", name: "ডিম (১ হালি)", category: "দুগ্ধ ও ডিম", unit: "hali", costPrice: 42, sellPrice: 50, initialStock: 50, reorderLevel: 15 },
    { id: "g-dudh", name: "তরল দুধ ১ লিটার", category: "দুগ্ধ ও ডিম", unit: "packet", costPrice: 90, sellPrice: 105, initialStock: 25, reorderLevel: 10 },
    { id: "g-cha", name: "চা পাতা ৪০০ গ্রাম", category: "পানীয়", unit: "packet", costPrice: 195, sellPrice: 225, initialStock: 30, reorderLevel: 10 },
    { id: "g-peaj", name: "পেঁয়াজ", category: "সবজি", unit: "kg", costPrice: 55, sellPrice: 68, initialStock: 75, reorderLevel: 20 },
    { id: "g-alu", name: "আলু", category: "সবজি", unit: "kg", costPrice: 45, sellPrice: 55, initialStock: 150, reorderLevel: 40 },
    { id: "g-rosun", name: "রসুন", category: "সবজি", unit: "kg", costPrice: 180, sellPrice: 210, initialStock: 25, reorderLevel: 10 },
    { id: "g-mos-holud", name: "হলুদ গুঁড়া ২০০ গ্রাম", category: "মসলা", unit: "packet", costPrice: 62, sellPrice: 75, initialStock: 40, reorderLevel: 15 },
    { id: "g-saban", name: "সাবান", category: "প্রসাধন", unit: "piece", costPrice: 42, sellPrice: 52, initialStock: 60, reorderLevel: 20 },
  ],

  pharmacy: [
    { id: "p-napa", name: "নাপা ৫০০ মিগ্রা (পাতা)", category: "প্যারাসিটামল", unit: "packet", costPrice: 8, sellPrice: 12, initialStock: 120, reorderLevel: 30 },
    { id: "p-napa-extra", name: "নাপা এক্সট্রা (পাতা)", category: "প্যারাসিটামল", unit: "packet", costPrice: 20, sellPrice: 25, initialStock: 90, reorderLevel: 25 },
    { id: "p-sergel-20", name: "সারজেল ২০ মিগ্রা (পাতা)", category: "গ্যাস্ট্রিক", unit: "packet", costPrice: 58, sellPrice: 70, initialStock: 80, reorderLevel: 20 },
    { id: "p-seclo-20", name: "সেকলো ২০ মিগ্রা (পাতা)", category: "গ্যাস্ট্রিক", unit: "packet", costPrice: 50, sellPrice: 60, initialStock: 85, reorderLevel: 20 },
    { id: "p-antacid", name: "এন্টাসিড প্লাস (পাতা)", category: "গ্যাস্ট্রিক", unit: "packet", costPrice: 15, sellPrice: 20, initialStock: 70, reorderLevel: 15 },
    { id: "p-ceevit", name: "সিভিট ৫০০ মিগ্রা (পাতা)", category: "ভিটামিন", unit: "packet", costPrice: 20, sellPrice: 25, initialStock: 100, reorderLevel: 25 },
    { id: "p-flexi", name: "ফ্লেক্সি ৫০ মিগ্রা (পাতা)", category: "ব্যথানাশক", unit: "packet", costPrice: 65, sellPrice: 80, initialStock: 60, reorderLevel: 15 },
    { id: "p-histasin", name: "হিস্টাসিন (পাতা)", category: "অ্যালার্জি", unit: "packet", costPrice: 4, sellPrice: 6, initialStock: 90, reorderLevel: 20 },
    { id: "p-ors", name: "ওআরএস স্যালাইন", category: "স্যালাইন", unit: "packet", costPrice: 5, sellPrice: 6, initialStock: 200, reorderLevel: 50 },
    { id: "p-savlon", name: "স্যাভলন লিকুইড ১০০ মিলি", category: "অ্যান্টিসেপটিক", unit: "piece", costPrice: 48, sellPrice: 58, initialStock: 40, reorderLevel: 10 },
    { id: "p-bandage", name: "ব্যান্ডেজ ও তুলা প্যাক", category: "ফার্স্ট এইড", unit: "piece", costPrice: 15, sellPrice: 25, initialStock: 50, reorderLevel: 15 },
    { id: "p-syrup", name: "প্যারাসিটামল সিরাপ ৬০ মিলি", category: "সিরাপ", unit: "piece", costPrice: 28, sellPrice: 35, initialStock: 35, reorderLevel: 10 },
    { id: "p-sanitizer", name: "হ্যান্ড স্যানিটাইজার ৫০ মিলি", category: "সুরক্ষা", unit: "piece", costPrice: 38, sellPrice: 50, initialStock: 45, reorderLevel: 12 },
    { id: "p-mask", name: "সার্জিক্যাল মাস্ক (পিস)", category: "সুরক্ষা", unit: "piece", costPrice: 3, sellPrice: 5, initialStock: 300, reorderLevel: 50 },
    { id: "p-thermometer", name: "ডিজিটাল থার্মোমিটার", category: "যন্ত্রপাতি", unit: "piece", costPrice: 110, sellPrice: 140, initialStock: 15, reorderLevel: 5 },
  ],

  tea_stall: [
    { id: "t-dudh-cha", name: "দুধ চা (প্রতি কাপ)", category: "চা", unit: "piece", costPrice: 6, sellPrice: 10, initialStock: 200, reorderLevel: 30 },
    { id: "t-lal-cha", name: "লাল চা / রঙ চা (কাপ)", category: "চা", unit: "piece", costPrice: 3, sellPrice: 6, initialStock: 250, reorderLevel: 30 },
    { id: "t-lebu-cha", name: "লেবু চা (প্রতি কাপ)", category: "চা", unit: "piece", costPrice: 4, sellPrice: 8, initialStock: 150, reorderLevel: 25 },
    { id: "t-malai-cha", name: "স্পেশাল মালাই চা (কাপ)", category: "চা", unit: "piece", costPrice: 15, sellPrice: 25, initialStock: 80, reorderLevel: 15 },
    { id: "t-coffee", name: "হট কফি (প্রতি কাপ)", category: "কফি", unit: "piece", costPrice: 12, sellPrice: 20, initialStock: 100, reorderLevel: 20 },
    { id: "t-green-tea", name: "গ্রিন টি (প্রতি কাপ)", category: "চা", unit: "piece", costPrice: 8, sellPrice: 15, initialStock: 60, reorderLevel: 15 },
    { id: "t-toast", name: "টোস্ট বিস্কুট (পিস)", category: "বিস্কুট", unit: "piece", costPrice: 3, sellPrice: 5, initialStock: 120, reorderLevel: 20 },
    { id: "t-cream-bis", name: "ক্রিম বিস্কুট প্যাকেট", category: "বিস্কুট", unit: "packet", costPrice: 8, sellPrice: 10, initialStock: 80, reorderLevel: 15 },
    { id: "t-bonruti", name: "বনরুটি / মিষ্টি বান", category: "রুটি ও কেক", unit: "piece", costPrice: 10, sellPrice: 15, initialStock: 50, reorderLevel: 10 },
    { id: "t-cake", name: "পাউন্ড কেক স্লাইস", category: "রুটি ও কেক", unit: "piece", costPrice: 14, sellPrice: 20, initialStock: 40, reorderLevel: 10 },
    { id: "t-kola", name: "সাগর কলা (পিস)", category: "ফল", unit: "piece", costPrice: 7, sellPrice: 10, initialStock: 60, reorderLevel: 12 },
    { id: "t-dim-boiled", name: "সেদ্ধ ডিম (পিস)", category: "ডিম", unit: "piece", costPrice: 11, sellPrice: 15, initialStock: 50, reorderLevel: 15 },
    { id: "t-water", name: "মিনারেল ওয়াটার ৫০০ মিলি", category: "পানীয়", unit: "piece", costPrice: 12, sellPrice: 15, initialStock: 48, reorderLevel: 12 },
    { id: "t-paan", name: "মিষ্টি পান (খিলি)", category: "পান", unit: "piece", costPrice: 6, sellPrice: 10, initialStock: 100, reorderLevel: 20 },
    { id: "t-cigarette", name: "সিগারেট (প্রতি শলা)", category: "ধূমপান", unit: "piece", costPrice: 13, sellPrice: 15, initialStock: 150, reorderLevel: 30 },
  ],

  raw_market: [
    { id: "r-alu", name: "আলু (প্রতি কেজি)", category: "সবজি", unit: "kg", costPrice: 45, sellPrice: 55, initialStock: 250, reorderLevel: 50 },
    { id: "r-peaj", name: "পেঁয়াজ (প্রতি কেজি)", category: "সবজি", unit: "kg", costPrice: 55, sellPrice: 68, initialStock: 150, reorderLevel: 30 },
    { id: "r-rosun", name: "রসুন (প্রতি কেজি)", category: "সবজি", unit: "kg", costPrice: 180, sellPrice: 210, initialStock: 40, reorderLevel: 15 },
    { id: "r-ada", name: "আদা (প্রতি কেজি)", category: "সবজি", unit: "kg", costPrice: 190, sellPrice: 225, initialStock: 30, reorderLevel: 10 },
    { id: "r-morich", name: "কাঁচা মরিচ (কেজি)", category: "সবজি", unit: "kg", costPrice: 100, sellPrice: 120, initialStock: 25, reorderLevel: 8 },
    { id: "r-tomato", name: "টমেটো (প্রতি কেজি)", category: "সবজি", unit: "kg", costPrice: 65, sellPrice: 80, initialStock: 50, reorderLevel: 15 },
    { id: "r-begun", name: "বেগুন (প্রতি কেজি)", category: "সবজি", unit: "kg", costPrice: 48, sellPrice: 60, initialStock: 40, reorderLevel: 12 },
    { id: "r-shosha", name: "শসা (প্রতি কেজি)", category: "সবজি", unit: "kg", costPrice: 38, sellPrice: 50, initialStock: 45, reorderLevel: 12 },
    { id: "r-fulkopi", name: "ফুলকপি (পিস)", category: "সবজি", unit: "piece", costPrice: 30, sellPrice: 40, initialStock: 35, reorderLevel: 10 },
    { id: "r-lau", name: "লাউ (পিস)", category: "সবজি", unit: "piece", costPrice: 38, sellPrice: 50, initialStock: 20, reorderLevel: 5 },
    { id: "r-mach-rui", name: "রুই মাছ (প্রতি কেজি)", category: "মাছ", unit: "kg", costPrice: 280, sellPrice: 320, initialStock: 35, reorderLevel: 10 },
    { id: "r-mach-katla", name: "কাতল মাছ (প্রতি কেজি)", category: "মাছ", unit: "kg", costPrice: 300, sellPrice: 350, initialStock: 30, reorderLevel: 8 },
    { id: "r-mach-tila", name: "তেলাপিয়া মাছ (কেজি)", category: "মাছ", unit: "kg", costPrice: 150, sellPrice: 180, initialStock: 45, reorderLevel: 12 },
    { id: "r-chicken-broiler", name: "ব্রয়লার মুরগি (কেজি)", category: "মাংস", unit: "kg", costPrice: 170, sellPrice: 190, initialStock: 50, reorderLevel: 15 },
    { id: "r-dim", name: "ডিম (১ হালি)", category: "ডিম", unit: "hali", costPrice: 42, sellPrice: 50, initialStock: 60, reorderLevel: 15 },
  ],

  service: SERVICE_BUSINESS_TYPES.flatMap((s) => s.defaultItems),

  other: [
    { id: "o-khata", name: "খাতা / নোটবুক", category: "স্টেশনারি", unit: "piece", costPrice: 35, sellPrice: 45, initialStock: 60, reorderLevel: 15 },
    { id: "o-pen", name: "বলপেন কলম (পিস)", category: "স্টেশনারি", unit: "piece", costPrice: 3.5, sellPrice: 5, initialStock: 200, reorderLevel: 50 },
    { id: "o-pencil", name: "পেন্সিল ও ইরেজার সেট", category: "স্টেশনারি", unit: "piece", costPrice: 10, sellPrice: 15, initialStock: 80, reorderLevel: 20 },
    { id: "o-calculator", name: "হিসাবের ক্যালকুলেটর", category: "ইলেকট্রনিক্স", unit: "piece", costPrice: 200, sellPrice: 260, initialStock: 15, reorderLevel: 5 },
    { id: "o-battery", name: "পেন্সিল ব্যাটারি (জোড়া)", category: "ইলেকট্রনিক্স", unit: "piece", costPrice: 14, sellPrice: 20, initialStock: 70, reorderLevel: 20 },
    { id: "o-bulb", name: "এলইডি বাল্ব ১২ ওয়াট", category: "ইলেকট্রনিক্স", unit: "piece", costPrice: 95, sellPrice: 125, initialStock: 30, reorderLevel: 10 },
    { id: "o-tissue", name: "টিস্যু বক্স / প্যাকেট", category: "প্রসাধন", unit: "packet", costPrice: 28, sellPrice: 38, initialStock: 50, reorderLevel: 15 },
    { id: "o-chata", name: "ছাতা (মাঝারি সাইজ)", category: "উপহার", unit: "piece", costPrice: 280, sellPrice: 350, initialStock: 18, reorderLevel: 5 },
    { id: "o-coil", name: "মশার কয়েল প্যাকেট", category: "গৃহস্থালি", unit: "packet", costPrice: 55, sellPrice: 70, initialStock: 40, reorderLevel: 12 },
    { id: "o-tape", name: "স্কচটেপ রুল", category: "গৃহস্থালি", unit: "piece", costPrice: 18, sellPrice: 25, initialStock: 50, reorderLevel: 15 },
    { id: "o-keyring", name: "চাবির রিং", category: "উপহার", unit: "piece", costPrice: 20, sellPrice: 35, initialStock: 40, reorderLevel: 10 },
    { id: "o-match", name: "দিয়াশলাই বক্স (ডজন)", category: "গৃহস্থালি", unit: "dozen", costPrice: 22, sellPrice: 30, initialStock: 30, reorderLevel: 10 },
  ],
};

/**
 * Persists the user-selected products into the shop store so when the app
 * loads for the new user or demo account, their chosen inventory is ready.
 */
export function seedCustomShopProducts(
  selectedTemplates: OnboardingProductTemplate[],
  shopType: ShopType,
  accountId: string,
  isDemo = false
): void {
  if (typeof window === "undefined") return;

  const today = new Date();
  const inMonths = (months: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };

  const products = selectedTemplates.map((t, idx) => ({
    id: `p-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    name: t.name,
    sku: `${t.category.slice(0, 3).toUpperCase()}-${idx + 101}`,
    category: t.category,
    unit: t.unit,
    batch: "",
    expiry: inMonths(10),
    stock: t.initialStock,
    reorderLevel: t.reorderLevel,
    costPrice: t.costPrice,
    sellPrice: t.sellPrice,
  }));

  const sales: Array<{
    id: string;
    date: string;
    customer: string;
    items: Array<{ productId: string; name: string; qty: number; unitPrice: number; unitCost: number }>;
    total: number;
    cost: number;
    saleType: "cash" | "credit";
    amountPaid: number;
  }> = [];

  const purchases: Array<{
    id: string;
    date: string;
    supplier: string;
    supplierCompany?: string;
    supplierPhone?: string;
    items: Array<{ productId: string; name: string; qty: number; unitCost: number }>;
    total: number;
  }> = [];

  if (isDemo && products.length > 0) {
    const customers = ["নগদ কাস্টমার", "রহিম উদ্দিন", "আয়েশা সিদ্দিকা", "করিম হোসেন", "সুমাইয়া আক্তার", "তানভীর আহমেদ"];
    for (let i = 18; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const m = products[Math.floor(Math.random() * products.length)];
      const qty = m.unit === "kg" || m.unit === "litre" ? 1 + Math.floor(Math.random() * 4) * 0.5 : 1 + Math.floor(Math.random() * 3);
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const total = Math.round(qty * m.sellPrice);
      const cost = Math.round(qty * m.costPrice);
      const isCredit = customer !== "নগদ কাস্টমার" && Math.random() < 0.35;
      sales.push({
        id: `demo-s-${i}`,
        date: d.toISOString(),
        customer,
        items: [{ productId: m.id, name: m.name, qty, unitPrice: m.sellPrice, unitCost: m.costPrice }],
        total,
        cost,
        saleType: isCredit ? "credit" : "cash",
        amountPaid: isCredit ? Math.round(total * 0.4) : total,
      });
    }

    const suppliers = ["সোনালী ট্রেডার্স", "ঢাকা সাপ্লাইয়ার্স", "মেসার্স রহিম ট্রেডার্স"];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (20 - i * 7));
      const m = products[Math.floor(Math.random() * products.length)];
      const qty = 10 + Math.floor(Math.random() * 20);
      purchases.push({
        id: `demo-p-${i}`,
        date: d.toISOString(),
        supplier: suppliers[i],
        supplierCompany: `${suppliers[i]} কোং`,
        items: [{ productId: m.id, name: m.name, qty, unitCost: m.costPrice }],
        total: Math.round(qty * m.costPrice),
      });
    }
  }

  try {
    const storeData = {
      state: {
        products,
        sales,
        purchases,
      },
      version: 0,
    };
    window.localStorage.setItem(scopedKey("dokan-store-v1", accountId), JSON.stringify(storeData));
    window.localStorage.setItem(scopedKey("hisab-nikash-shop-type", accountId), shopType);
  } catch {
    /* quota ignore */
  }
}
