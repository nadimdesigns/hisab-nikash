import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth, SKIP_ONBOARDING_KEY } from "@/lib/auth";
import { holdUpdates } from "@/lib/updateGate";
import { activateAccount } from "@/lib/accountScope";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "@/hooks/use-toast";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/copy";
import {
  ONBOARDING_MOTHER_TYPES,
  ONBOARDING_SHOP_TYPES,
  SHOP_TYPE_PRODUCTS,
  type MotherType,
  type ShopType,
  seedCustomShopProducts,
  getOnboardingTypeInfo,
} from "@/lib/onboardingData";

/** Categories shown before the "more categories" button; only their products start ticked. */
const VISIBLE_CATEGORIES = 5;

function defaultSelectedIds(type: ShopType): Set<string> {
  const items = SHOP_TYPE_PRODUCTS[type] || [];
  const firstCategories = new Set(Array.from(new Set(items.map((p) => p.category))).slice(0, VISIBLE_CATEGORIES));
  return new Set(items.filter((p) => firstCategories.has(p.category)).map((p) => p.id));
}

const PHONE_DOMAIN = "hisabnikash.com";
const authEmailFor = (phone: string) => `${phone.replace(/\D/g, "")}@${PHONE_DOMAIN}`;
const authPasswordFor = (pin: string) => `H1${pin}`;
const parsedPhoneDigits = (phone: string) => phone.replace(/\D/g, "");

/** Reads the `{ error }` code the signup function answers with (409 already_registered, 429 rate_limited, ...). */
async function signupErrorCode(err: unknown): Promise<string | null> {
  const ctx = (err as { context?: Response }).context;
  if (!ctx || typeof ctx.json !== "function") return null;
  try {
    const body = await ctx.clone().json();
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

const phoneSchema = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, { message: "সঠিক মোবাইল নম্বর দিন (যেমন: 01712345678)" });

const pinSchema = z.string().regex(/^\d{4}$/, { message: "পিন ৪ সংখ্যার হতে হবে" });

type FieldErrors = {
  phone?: string;
  pin?: string;
  confirmPin?: string;
  form?: string;
};

// 4 Steps:
// 0) "step-0-mother": Mother Type Selection (New splash screen onboarding: Dokan, Samity, Personal, Education, Salon, Other)
// 1) "step-1-shop": Shop Type Selection (under "দোকানের হিসাব", which was previously the 1st step)
// 2) "step-2-products": Product / Item Selection checklist
// 3) "step-3-phone": Mobile number + PIN on one screen, no primary button.
//    11 valid digits -> the number is looked up (new vs existing) automatically,
//    PIN boxes appear underneath; a complete PIN (confirmed PIN for a new
//    account) logs in / creates the account and lands on the homepage.
type Step = "step-0-mother" | "step-1-shop" | "step-2-products" | "step-3-phone";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  // Flow State
  // After a sign-out go straight to the phone step (step 3), not onboarding.
  const [step, setStep] = useState<Step>(() => {
    try {
      return sessionStorage.getItem(SKIP_ONBOARDING_KEY) ? "step-3-phone" : "step-0-mother";
    } catch {
      return "step-0-mother";
    }
  });
  useEffect(() => {
    try {
      sessionStorage.removeItem(SKIP_ONBOARDING_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  const [selectedMotherType, setSelectedMotherType] = useState<MotherType>("dokan");
  const [selectedShopType, setSelectedShopType] = useState<ShopType>("grocery");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => defaultSelectedIds("grocery"));

  // Step 2: only the first 5 categories are listed until "more" is pressed
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Opening the full list scrolls to the very bottom of the page, closing it back to the top. Done
  // after the list has re-rendered (the page height changes), with an instant fallback in case
  // the browser dropped the smooth scroll while the page was shrinking.
  const categoriesToggled = useRef(false);
  useEffect(() => {
    if (!categoriesToggled.current) {
      categoriesToggled.current = true;
      return;
    }
    const toTop = !showAllCategories;
    const go = (behavior: ScrollBehavior) =>
      window.scrollTo({ top: toTop ? 0 : document.documentElement.scrollHeight, behavior });
    const raf = requestAnimationFrame(() => go("smooth"));
    const fallback = window.setTimeout(() => {
      const target = toTop ? 0 : document.documentElement.scrollHeight - window.innerHeight;
      if (Math.abs(window.scrollY - target) > 2) go("auto");
    }, 700);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [showAllCategories]);

  // Step 2: which categories are expanded
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  // Product names the user edited in step 2 (id -> name)
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  // User credentials state
  const [phone, setPhone] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && session) {
      navigate(from, { replace: true });
    }
  }, [loading, session, from, navigate]);

  // When user selects a mother type in Step 0
  const handleSelectMotherType = (motherId: MotherType) => {
    setSelectedMotherType(motherId);
    setOpenCategories(new Set());
    setShowAllCategories(false);

    if (motherId === "dokan") {
      setStep("step-1-shop");
    } else {
      setSelectedShopType(motherId as ShopType);
      setSelectedProductIds(defaultSelectedIds(motherId as ShopType));
      setStep("step-2-products");
    }
  };

  // When user selects a shop type in Step 1 (under "দোকানের হিসাব"), immediately proceed to Step 2
  const handleSelectShopType = (type: ShopType) => {
    setSelectedShopType(type);
    setOpenCategories(new Set());
    setShowAllCategories(false);
    setSelectedProductIds(defaultSelectedIds(type));
    setStep("step-2-products");
  };

  // Toggle individual product selection in Step 2
  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCategory = (items: { id: string }[], on: boolean) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      items.forEach((p) => (on ? next.add(p.id) : next.delete(p.id)));
      return next;
    });
  };

  const toggleCategoryOpen = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const selectAllProducts = () => {
    const all = new Set(SHOP_TYPE_PRODUCTS[selectedShopType].map((p) => p.id));
    setSelectedProductIds(all);
  };

  const deselectAllProducts = () => {
    setSelectedProductIds(new Set());
  };

  const mapAuthError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("email address") || m.includes("invalid email"))
      return "মোবাইল নম্বরটি সঠিক নয়।";
    if (m.includes("not confirmed")) return "অ্যাকাউন্টটি নিশ্চিত করা হয়নি।";
    if (m.includes("invalid login credentials"))
      return "মোবাইল নম্বর বা পিন ভুল।";
    if (m.includes("rate limit")) return "অনেকবার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করুন।";
    return msg;
  };

  // Step 3: as soon as 11 valid digits are typed, look the number up (new vs existing).
  const phoneCheckToken = useRef(0);

  const lookupPhone = async (value: string) => {
    const token = ++phoneCheckToken.current;
    setCheckingPhone(true);
    let existing = false;
    try {
      const { data, error } = await supabase.rpc("hisab_nikash_phone_has_account", { _phone: value });
      // On a lookup error treat it as new: the signup function reports "already registered" if it is not.
      existing = !error && !!data;
    } catch {
      existing = false;
    }
    if (token !== phoneCheckToken.current) return; // the number changed while we were checking
    setIsExistingAccount(existing);
    setCheckingPhone(false);
  };

  const handlePhoneChange = (raw: string) => {
    let v = raw.replace(/\D/g, "");
    if (v.length === 10 && v[0] !== "0") v = `0${v}`;
    v = v.slice(0, 11);
    setPhone(v);

    // Any edit invalidates the previous lookup and the PIN fields.
    phoneCheckToken.current++;
    setIsExistingAccount(null);
    setCheckingPhone(false);
    setPin("");
    setConfirmPin("");
    setErrors({});

    if (v.length === 11) {
      const parsed = phoneSchema.safeParse(v);
      if (!parsed.success) {
        setErrors({ phone: parsed.error.issues[0]?.message });
        return;
      }
      void lookupPhone(parsed.data);
    }
  };

  // Log in (existing) or create the account (new) once the PIN is complete.
  const submitCredentials = async (pinValue: string, confirmValue?: string) => {
    if (submitting || isExistingAccount === null) return;

    const parsedPin = pinSchema.safeParse(pinValue);
    if (!parsedPin.success) {
      setErrors({ pin: parsedPin.error.issues[0]?.message });
      return;
    }

    // New account: the confirmation PIN must match before anything is created.
    if (!isExistingAccount && confirmValue !== pinValue) {
      setErrors({ confirmPin: "পিন দুটি মিলছে না।" });
      setConfirmPin("");
      return;
    }

    setErrors({});
    setSubmitting(true);
    // A new deployment must not reload the page between "account created" and "signed in".
    const releaseUpdates = holdUpdates();

    try {
      if (isExistingAccount) {
        // Existing user login
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmailFor(phone),
          password: authPasswordFor(parsedPin.data),
        });
        if (error) {
          setErrors({ form: mapAuthError(error.message) });
          setPin("");
        } else {
          toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
          navigate(from, { replace: true });
        }
      } else {
        // New user signup
        const chosenTemplates = (SHOP_TYPE_PRODUCTS[selectedShopType] || [])
          .filter((p) => selectedProductIds.has(p.id))
          .map((p) => ({ ...p, name: (productNames[p.id] ?? p.name).trim() || p.name }));

        // Phone + PIN only: the account is created already-confirmed on the
        // server (no email is ever sent), then we sign in with it.
        const { error: signupError } = await supabase.functions.invoke("hisab-nikash-signup", {
          body: { phone: parsedPhoneDigits(phone), pin: parsedPin.data },
        });
        const errorCode = signupError ? await signupErrorCode(signupError) : null;
        const alreadyRegistered = errorCode === "already_registered";

        if (signupError && !alreadyRegistered) {
          setErrors({
            form:
              errorCode === "rate_limited"
                ? "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
                : "অ্যাকাউন্ট তৈরি করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
          });
          setConfirmPin("");
        } else {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: authEmailFor(phone),
            password: authPasswordFor(parsedPin.data),
          });
          if (signInError) {
            if (alreadyRegistered) {
              setIsExistingAccount(true);
              setErrors({ form: "এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। সঠিক পিন দিন।" });
            } else {
              setErrors({ form: mapAuthError(signInError.message) });
            }
            setPin("");
            setConfirmPin("");
          } else {
            const currentInfo = getOnboardingTypeInfo(selectedShopType);
            toast({
              title: alreadyRegistered ? "স্বাগতম" : "স্বাগতম!",
              description: alreadyRegistered
                ? "লগইন সফল হয়েছে।"
                : `আপনার ${currentInfo.title} ও ${chosenTemplates.length}টি এন্ট্রি প্রস্তুত করা হয়েছে।`,
            });
            const accountId = signInData.user?.id;
            if (accountId) {
              // This account's own shop data (never another account's), then a hard reload so every
              // store starts from it.
              if (!alreadyRegistered) seedCustomShopProducts(chosenTemplates, selectedShopType, accountId);
              activateAccount(accountId, { isNew: !alreadyRegistered });
              window.location.replace(from);
              return;
            }
            navigate(from, { replace: true });
          }
        }
      }
    } finally {
      releaseUpdates();
      setSubmitting(false);
    }
  };

  const otpSlotClass = (hasError?: string) =>
    cn(
      "h-auto aspect-square w-full rounded-2xl border border-input bg-white text-lg font-semibold shadow-sm dark:bg-white/10",
      hasError && "border-destructive text-destructive"
    );

  const currentProductsList = SHOP_TYPE_PRODUCTS[selectedShopType] || [];
  const productCategories = Array.from(
    currentProductsList.reduce((m, p) => m.set(p.category, [...(m.get(p.category) ?? []), p]), new Map<string, typeof currentProductsList>()),
  ).map(([category, items]) => ({ category, items }));
  const visibleCategories = showAllCategories ? productCategories : productCategories.slice(0, VISIBLE_CATEGORIES);
  const hiddenCategoryCount = Math.max(0, productCategories.length - VISIBLE_CATEGORIES);
  const currentShopInfo = getOnboardingTypeInfo(selectedShopType);

  const getProductHeaderTitle = () => {
    if (selectedShopType === "salon") return "সেলুন / পার্লারের সেবা";
    if (selectedShopType === "samity") return "সঞ্চয় ও সমিতির এন্ট্রি";
    if (selectedShopType === "personal") return "ব্যক্তিগত / পারিবারিক তালিকা";
    if (selectedShopType === "education") return "শিক্ষা প্রতিষ্ঠানের ফি তালিকা";
    return `${currentShopInfo.shortTitle}র পণ্য`;
  };

  return (
    <main className="min-h-[100svh] w-full bg-background flex flex-col items-center justify-start p-3 sm:p-4 pt-[max(20px,env(safe-area-inset-top))] pb-10 overflow-y-auto">
      <Card className="w-full max-w-lg rounded-[28px] border border-brand-200 dark:border-brand-800/30 overflow-hidden bg-card transition-all my-0">
        {/* Top Header: icon + app name side by side (icon 1.3x, not clipped), tint blue */}
        <div className="relative bg-gradient-to-br from-brand-100 to-brand-50 border-b border-brand-200 px-5 pt-5 pb-5 flex flex-row items-center justify-center gap-3 text-center dark:from-brand-950/50 dark:to-brand-900/20 dark:border-brand-800/40">
          <img
            src="/logo.webp?v=7"
            alt={APP_NAME}
            className="relative h-[78px] w-[78px] shrink-0 object-contain"
          />
          <span className="relative whitespace-nowrap text-xl sm:text-2xl font-bold text-gray-950 dark:text-white leading-tight tracking-tight">
            {APP_NAME}
          </span>
        </div>

        <CardContent className="bg-brand-50/70 px-4 sm:px-6 pt-5 pb-6 dark:bg-brand-950/20">
          {/* ================= STEP 0: MOTHER TYPE SELECTION (NEW SPLASH ONBOARDING) ================= */}
          {step === "step-0-mother" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className={typography("h4", "text-foreground font-bold")}>
                  কিসের হিসাব রাখতে চান?
                </h2>
                <p className="text-xs text-muted-foreground">
                  আপনার ব্যবসার ধরন বা হিসাবের প্রধান ক্যাটাগরি বেছে নিন
                </p>
              </div>

              {/* Mother type list: one full-width card per row, icon left, arrow right */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {ONBOARDING_MOTHER_TYPES.map((mother) => {
                  const isSelected = selectedMotherType === mother.id;
                  return (
                    <button
                      key={mother.id}
                      type="button"
                      onClick={() => handleSelectMotherType(mother.id)}
                      className={cn(
                        "group relative flex w-full items-center gap-3.5 p-3 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] min-h-[66px]",
                        isSelected
                          ? "border-brand-600 bg-brand-500/15 ring-2 ring-brand-600/60 dark:bg-brand-500/20"
                          : "border-border/80 bg-white/80 hover:bg-white hover:border-brand-300 dark:bg-white/5 dark:hover:bg-white/10"
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-2xl group-hover:scale-105 transition-transform">
                        <span aria-hidden="true">{mother.emoji}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-sm sm:text-base text-foreground leading-snug">
                          {mother.title}
                        </span>
                        <span className="block text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                          {mother.description}
                        </span>
                      </div>

                      {/* Right indicator arrow */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100/70 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 group-hover:translate-x-0.5 transition-transform text-xs font-bold">
                        ➔
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Direct login link */}
              <div className="pt-2 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("step-3-phone");
                    setErrors({});
                  }}
                  className="text-xs font-semibold text-brand-800 dark:text-brand-300 hover:bg-transparent hover:underline"
                >
                  ইতিমধ্যে অ্যাকাউন্ট আছে? সরাসরি লগইন করুন
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 1: SHOP TYPE SELECTION (UNDER "দোকানের হিসাব") ================= */}
          {step === "step-1-shop" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className={typography("h4", "text-foreground font-bold")}>
                  দোকানের ধরন বেছে নিন
                </h2>
                <p className="text-xs text-muted-foreground">
                  আপনার দোকানের প্রধান ক্যাটাগরি নির্বাচন করুন
                </p>
              </div>

              {/* Shop type list */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {ONBOARDING_SHOP_TYPES.map((shop) => {
                  const isSelected = selectedShopType === shop.id;
                  return (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => handleSelectShopType(shop.id)}
                      className={cn(
                        "relative flex w-full items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] min-h-[64px]",
                        isSelected
                          ? "border-brand-600 bg-brand-500/15 ring-2 ring-brand-600/60 dark:bg-brand-500/20"
                          : "border-border/80 bg-white/80 hover:bg-white hover:border-brand-300 dark:bg-white/5 dark:hover:bg-white/10"
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-2xl">
                        <span aria-hidden="true">{shop.emoji}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-sm sm:text-base text-foreground leading-snug">
                          {shop.title}
                        </span>
                        <span className="block text-[11px] sm:text-xs text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                          {shop.description}
                        </span>
                      </div>

                      {/* Radio / Check indicator, right middle */}
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
                          isSelected
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-muted-foreground/40 bg-transparent"
                        )}
                      >
                        {isSelected && <span className="text-[11px] leading-none font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Back button to Mother Types + Direct login link */}
              <div className="pt-2 flex flex-col items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("step-0-mother")}
                  className="text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                  ← পূর্ববর্তী ধাপে যান
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("step-3-phone");
                    setErrors({});
                  }}
                  className="text-xs font-semibold text-brand-800 dark:text-brand-300 hover:bg-transparent hover:underline"
                >
                  ইতিমধ্যে অ্যাকাউন্ট আছে? সরাসরি লগইন করুন
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PRODUCT / ENTRY SELECTION ================= */}
          {step === "step-2-products" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-brand-200/60 pb-2.5 dark:border-brand-800/40">
                <h2 className="text-sm sm:text-[15px] font-bold text-foreground flex items-center gap-1.5">
                  <span>{currentShopInfo.emoji}</span>
                  <span>{getProductHeaderTitle()}</span>
                </h2>

                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                    selectedProductIds.size >= 1
                      ? "bg-brand-600 text-white"
                      : "bg-rose-600 text-white animate-pulse"
                  )}
                >
                  {selectedProductIds.size}টি নির্বাচিত
                </span>
              </div>

              {/* Quick Select All / Deselect All */}
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-muted-foreground text-[11px]">
                  {productCategories.length}টি ক্যাটাগরি · মোট {currentProductsList.length}টি এন্ট্রি/পণ্য
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    সব নির্বাচন
                  </button>
                  <span className="text-muted-foreground/40">•</span>
                  <button
                    type="button"
                    onClick={deselectAllProducts}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    সব মুছুন
                  </button>
                </div>
              </div>

              {/* Categories: tick a category to include all its products, open it to pick/rename products */}
              <div className="grid grid-cols-1 gap-2">
                {visibleCategories.map(({ category, items }) => {
                  const selectedCount = items.filter((p) => selectedProductIds.has(p.id)).length;
                  const allOn = selectedCount === items.length;
                  const someOn = selectedCount > 0 && !allOn;
                  const open = openCategories.has(category);
                  return (
                    <div key={category} className="rounded-xl border border-brand-200/60 bg-white/80 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={allOn ? true : someOn ? "mixed" : false}
                          aria-label={`${category} ক্যাটাগরি নির্বাচন`}
                          onClick={() => toggleCategory(items, !allOn)}
                          className={cn(
                            "h-6 w-6 shrink-0 rounded-md flex items-center justify-center border transition-colors active:scale-95",
                            allOn || someOn
                              ? "bg-brand-600 border-brand-600 text-white"
                              : "border-muted-foreground/40 bg-white dark:bg-white/10"
                          )}
                        >
                          {allOn && <span className="text-xs font-bold leading-none">✓</span>}
                          {someOn && <span className="text-xs font-bold leading-none">–</span>}
                        </button>
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => toggleCategoryOpen(category)}
                          className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1.5 text-left"
                        >
                          <span className="truncate text-sm font-semibold text-foreground">{category}</span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                            {selectedCount}/{items.length}টি
                            <span aria-hidden="true" className={cn("transition-transform", open && "rotate-180")}>▾</span>
                          </span>
                        </button>
                      </div>
                      {open && (
                        <div className="space-y-1.5 border-t border-brand-200/50 px-2 py-2 dark:border-white/10">
                          {items.map((product) => {
                            const isChecked = selectedProductIds.has(product.id);
                            return (
                              <div key={product.id} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={isChecked}
                                  aria-label={`${productNames[product.id] ?? product.name} নির্বাচন`}
                                  onClick={() => toggleProduct(product.id)}
                                  className={cn(
                                    "h-6 w-6 shrink-0 rounded-md flex items-center justify-center border transition-colors active:scale-95",
                                    isChecked
                                      ? "bg-brand-600 border-brand-600 text-white"
                                      : "border-muted-foreground/40 bg-white dark:bg-white/10"
                                  )}
                                >
                                  {isChecked && <span className="text-xs font-bold leading-none">✓</span>}
                                </button>
                                <Input
                                  value={productNames[product.id] ?? product.name}
                                  onChange={(e) => setProductNames((prev) => ({ ...prev, [product.id]: e.target.value }))}
                                  onBlur={(e) => {
                                    if (!e.target.value.trim()) {
                                      setProductNames((prev) => {
                                        const { [product.id]: _drop, ...rest } = prev;
                                        return rest;
                                      });
                                    }
                                  }}
                                  maxLength={60}
                                  aria-label="পণ্যের নাম"
                                  className={cn(
                                    "h-10 rounded-lg bg-white text-sm dark:bg-white/10",
                                    !isChecked && "text-muted-foreground"
                                  )}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {hiddenCategoryCount > 0 || showAllCategories ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-expanded={showAllCategories}
                    onClick={() => setShowAllCategories((v) => !v)}
                    className="h-8 rounded-full px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100/70 dark:text-brand-300"
                  >
                    {showAllCategories ? "কম দেখান ▴" : `আরও ${hiddenCategoryCount}টি ক্যাটাগরি ▾`}
                  </Button>
                </div>
              ) : null}

              {selectedProductIds.size === 0 && (
                <p role="alert" className="text-xs text-rose-600 font-medium text-center bg-rose-50 dark:bg-rose-950/30 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                  ⚠️ কমপক্ষে ১টি এন্ট্রি বা পণ্য নির্বাচন করুন।
                </p>
              )}

              {/* Action Buttons: Primary CTA for multi-select + Center-aligned Ghost Back Button */}
              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  size="lg"
                  disabled={selectedProductIds.size === 0}
                  onClick={() => {
                    if (selectedProductIds.size >= 1) {
                      setStep("step-3-phone");
                    }
                  }}
                  className="w-full rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 font-semibold text-white shadow-md shadow-brand-700/20 hover:from-brand-600 hover:via-brand-500 hover:to-brand-400 active:scale-[0.98]"
                >
                  পরবর্তী ধাপ ➔
                </Button>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedMotherType === "dokan") {
                        setStep("step-1-shop");
                      } else {
                        setStep("step-0-mother");
                      }
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
                  >
                    ← পূর্ববর্তী ধাপে যান
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PHONE NUMBER ================= */}
          {step === "step-3-phone" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-brand-100/60 dark:bg-brand-900/30 p-2.5 rounded-2xl border border-brand-200 dark:border-brand-800/40">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {currentShopInfo.emoji}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-tight">
                      {currentShopInfo.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {`${selectedProductIds.size}টি প্রারম্ভিক হিসাব/পণ্য নির্বাচিত`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("step-2-products")}
                  className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline px-2 py-1"
                >
                  পরিবর্তন ✏️
                </button>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-3.5" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className={typography("body-strong")}>
                    মোবাইল নম্বর
                  </Label>
                  <div
                    className={cn(
                      "flex h-12 w-full items-center rounded-2xl border border-input bg-white shadow-sm transition-all dark:bg-white/10 overflow-hidden",
                      "focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/30",
                      errors.phone && "border-destructive focus-within:border-destructive focus-within:ring-destructive/30"
                    )}
                  >
                    <span className="inline-flex h-full shrink-0 select-none items-center border-r border-input bg-brand-50/50 px-3.5 text-sm font-semibold text-muted-foreground dark:bg-white/5">
                      +88
                    </span>
                    <input
                      id="phone"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel-national"
                      autoFocus
                      maxLength={11}
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      disabled={submitting}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="h-full w-full bg-transparent px-3.5 text-[15px] outline-none placeholder:text-muted-foreground/60 border-none focus:outline-none focus:ring-0 text-foreground"
                    />
                  </div>
                  {errors.phone && (
                    <p className={typography("muted", "text-destructive text-xs")}>{errors.phone}</p>
                  )}
                </div>

                {checkingPhone && (
                  <p className={typography("muted", "text-xs text-center")}>যাচাই হচ্ছে…</p>
                )}

                {/* PIN boxes appear under the number once it has been looked up */}
                {!checkingPhone && isExistingAccount !== null && (
                  <div className="space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-center text-xs font-semibold text-brand-700 dark:text-brand-300">
                      {isExistingAccount ? "অ্যাকাউন্ট পাওয়া গেছে, পিন দিন" : "নতুন অ্যাকাউন্ট, পিন সেট করুন"}
                    </p>

                    <div className="space-y-1.5">
                      <Label htmlFor="pin" className={typography("body-strong")}>
                        {isExistingAccount ? "আপনার ৪ সংখ্যার পিন" : "৪ সংখ্যার নতুন পিন"}
                      </Label>
                      <InputOTP
                        id="pin"
                        maxLength={4}
                        value={pin}
                        disabled={submitting}
                        onChange={(v) => {
                          setPin(v);
                          if (!isExistingAccount) setConfirmPin("");
                          if (errors.pin || errors.confirmPin || errors.form)
                            setErrors((prev) => ({ ...prev, pin: undefined, confirmPin: undefined, form: undefined }));
                        }}
                        onComplete={(v) => {
                          if (isExistingAccount) void submitCredentials(v);
                        }}
                        pattern="^[0-9]+$"
                        inputMode="numeric"
                        autoFocus
                      >
                        <InputOTPGroup className="w-full grid grid-cols-4 gap-3">
                          <InputOTPSlot index={0} className={otpSlotClass(errors.pin)} />
                          <InputOTPSlot index={1} className={otpSlotClass(errors.pin)} />
                          <InputOTPSlot index={2} className={otpSlotClass(errors.pin)} />
                          <InputOTPSlot index={3} className={otpSlotClass(errors.pin)} />
                        </InputOTPGroup>
                      </InputOTP>
                      {errors.pin && (
                        <p className={typography("muted", "text-destructive text-xs")}>{errors.pin}</p>
                      )}
                    </div>

                    {/* New account: confirm PIN appears once the first PIN is complete */}
                    {!isExistingAccount && pin.length === 4 && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label htmlFor="confirmPin" className={typography("body-strong")}>
                          পিন নিশ্চিত করুন
                        </Label>
                        <InputOTP
                          id="confirmPin"
                          maxLength={4}
                          value={confirmPin}
                          disabled={submitting}
                          onChange={(v) => {
                            setConfirmPin(v);
                            if (errors.confirmPin || errors.form)
                              setErrors((prev) => ({ ...prev, confirmPin: undefined, form: undefined }));
                          }}
                          onComplete={(v) => void submitCredentials(pin, v)}
                          pattern="^[0-9]+$"
                          inputMode="numeric"
                          autoFocus
                        >
                          <InputOTPGroup className="w-full grid grid-cols-4 gap-3">
                            <InputOTPSlot index={0} className={otpSlotClass(errors.confirmPin)} />
                            <InputOTPSlot index={1} className={otpSlotClass(errors.confirmPin)} />
                            <InputOTPSlot index={2} className={otpSlotClass(errors.confirmPin)} />
                            <InputOTPSlot index={3} className={otpSlotClass(errors.confirmPin)} />
                          </InputOTPGroup>
                        </InputOTP>
                        {errors.confirmPin && (
                          <p className={typography("muted", "text-destructive text-xs")}>{errors.confirmPin}</p>
                        )}
                      </div>
                    )}

                    {submitting && (
                      <p className={typography("muted", "text-xs text-center")}>
                        {isExistingAccount ? "লগইন হচ্ছে…" : "অ্যাকাউন্ট তৈরি হচ্ছে…"}
                      </p>
                    )}
                  </div>
                )}

                {errors.form && (
                  <p role="alert" className={typography("muted", "text-destructive text-xs text-center")}>
                    {errors.form}
                  </p>
                )}

                {/* No primary button: everything above submits itself. Only a back link remains. */}
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={submitting}
                    onClick={() => setStep("step-2-products")}
                    className="text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
                  >
                    ← পূর্ববর্তী ধাপে যান
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;
