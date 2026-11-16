import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "@/hooks/use-toast";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/copy";
import { enableDemoMode, setCachedRole } from "@/lib/demoMode";
import { seedDemoCustomers } from "@/lib/demoSeed";
import {
  ONBOARDING_SHOP_TYPES,
  SHOP_TYPE_PRODUCTS,
  type ShopType,
  seedCustomShopProducts,
} from "@/lib/onboardingData";

const PHONE_DOMAIN = "hisabnikash.com";
const authEmailFor = (phone: string) => `${phone.replace(/\D/g, "")}@${PHONE_DOMAIN}`;
const authPasswordFor = (pin: string) => `H1${pin}`;

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

// Flow modes:
// 1) "onboarding-1": Shop type selection
// 2) "onboarding-2": 3-column product multi-select checklist (min 1 item)
// 3) "onboarding-3": Signup form (phone + 4-digit PIN)
// 4) "direct-login": Direct login for returning users (phone + PIN)
type ViewMode = "onboarding-1" | "onboarding-2" | "onboarding-3" | "direct-login";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  // Flow State
  const [viewMode, setViewMode] = useState<ViewMode>("onboarding-1");
  const [selectedShopType, setSelectedShopType] = useState<ShopType>("grocery");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => {
    return new Set(SHOP_TYPE_PRODUCTS["grocery"].map((p) => p.id));
  });

  // Direct login / returning user state
  const [directPhone, setDirectPhone] = useState("");
  const [directPin, setDirectPin] = useState("");
  const [directStep, setDirectStep] = useState<"phone" | "pin">("phone");

  // Onboarding Step 3 Signup state
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPin, setSignupPin] = useState("");
  const [signupConfirmPin, setSignupConfirmPin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && session) {
      navigate(from, { replace: true });
    }
  }, [loading, session, from, navigate]);

  // When user switches shop type in Step 1, select all default products for that type
  const handleSelectShopType = (type: ShopType) => {
    setSelectedShopType(type);
    setSelectedProductIds(new Set(SHOP_TYPE_PRODUCTS[type].map((p) => p.id)));
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

  // Handle Onboarding Step 3 (Signup)
  const handleOnboardingSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPhone = phoneSchema.safeParse(signupPhone);
    if (!parsedPhone.success) {
      setErrors({ phone: parsedPhone.error.issues[0]?.message });
      return;
    }

    const parsedPin = pinSchema.safeParse(signupPin);
    if (!parsedPin.success) {
      setErrors({ pin: parsedPin.error.issues[0]?.message });
      return;
    }

    if (signupConfirmPin !== signupPin) {
      setErrors({ confirmPin: "পিন দুটি মিলছে না।" });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      // 1) Seed the chosen products
      const chosenTemplates = SHOP_TYPE_PRODUCTS[selectedShopType].filter((p) =>
        selectedProductIds.has(p.id)
      );
      seedCustomShopProducts(chosenTemplates, selectedShopType);

      // 2) Sign up in Supabase
      const { data, error } = await supabase.auth.signUp({
        email: authEmailFor(signupPhone),
        password: authPasswordFor(parsedPin.data),
      });

      if (error) {
        setErrors({ form: mapAuthError(error.message) });
      } else if (data.session) {
        toast({
          title: "স্বাগতম!",
          description: `আপনার অ্যাকাউন্ট ও ${chosenTemplates.length}টি প্রাথমিক পণ্য প্রস্তুত করা হয়েছে।`,
        });
        navigate(from, { replace: true });
      } else {
        // If already registered, attempt login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmailFor(signupPhone),
          password: authPasswordFor(parsedPin.data),
        });
        if (signInError) {
          setErrors({ form: "এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। সঠিক পিন দিয়ে লগইন করুন।" });
          setDirectPhone(signupPhone);
          setDirectPin(signupPin);
          setDirectStep("pin");
          setViewMode("direct-login");
        } else {
          toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
          navigate(from, { replace: true });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Enter demo mode with the user's selected shop type and products
  const handleOnboardingDemo = () => {
    const chosenTemplates = SHOP_TYPE_PRODUCTS[selectedShopType].filter((p) =>
      selectedProductIds.has(p.id)
    );
    seedCustomShopProducts(chosenTemplates, selectedShopType, true);
    enableDemoMode();
    setCachedRole(null);
    seedDemoCustomers();
    window.dispatchEvent(new Event("pharmasee-demo-changed"));
    toast({
      title: "ডেমো মোড চালু হয়েছে",
      description: `${ONBOARDING_SHOP_TYPES.find((s) => s.id === selectedShopType)?.shortTitle} এবং ${chosenTemplates.length}টি পণ্য লোড করা হয়েছে।`,
    });
    window.location.replace("/");
  };

  // Direct login: phone check
  const handleDirectPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = phoneSchema.safeParse(directPhone);
    if (!parsed.success) {
      setErrors({ phone: parsed.error.issues[0]?.message });
      return;
    }

    setErrors({});
    setCheckingPhone(true);
    try {
      const { data, error } = await supabase.rpc("hisab_nikash_phone_has_account", {
        _phone: parsed.data,
      });
      if (error) {
        setErrors({ form: "একটু সমস্যা হয়েছে, আবার চেষ্টা করুন।" });
        return;
      }
      if (!data) {
        setErrors({ form: "এই নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। নতুন অ্যাকাউন্ট খুলুন।" });
        return;
      }
      setDirectStep("pin");
    } finally {
      setCheckingPhone(false);
    }
  };

  // Direct login: PIN submit
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pinSchema.safeParse(directPin);
    if (!parsed.success) {
      setErrors({ pin: parsed.error.issues[0]?.message });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmailFor(directPhone),
        password: authPasswordFor(parsed.data),
      });
      if (error) {
        setErrors({ form: mapAuthError(error.message) });
      } else {
        toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
        navigate(from, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const otpSlotClass = (hasError?: string) =>
    cn(
      "h-auto aspect-square w-full rounded-2xl border border-input bg-white text-lg font-semibold shadow-sm dark:bg-white/10",
      hasError && "border-destructive text-destructive"
    );

  const currentProductsList = SHOP_TYPE_PRODUCTS[selectedShopType] || [];
  const currentShopInfo = ONBOARDING_SHOP_TYPES.find((s) => s.id === selectedShopType) || ONBOARDING_SHOP_TYPES[0];

  return (
    <main className="min-h-[100svh] w-full bg-background flex flex-col items-center justify-start p-3 sm:p-4 pt-[max(20px,env(safe-area-inset-top))] pb-10 overflow-y-auto">
      <Card className="w-full max-w-lg rounded-[28px] border border-emerald-800/20 shadow-2xl overflow-hidden bg-card transition-all my-0">
        {/* Splash Header with Logo and Title */}
        <div className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 px-5 pt-6 pb-5 flex flex-col items-center gap-2 overflow-hidden text-center">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 pointer-events-none" aria-hidden />
          <div className="absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-white/10 pointer-events-none" aria-hidden />

          <img
            src="/logo.webp"
            alt={APP_NAME}
            className="relative h-[64px] w-[64px] object-contain shadow-md shadow-emerald-950/40 rounded-2xl"
          />
          <span className="relative text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
            {APP_NAME}
          </span>
          <span className="relative text-xs sm:text-sm text-emerald-100/90 max-w-xs">
            {viewMode === "direct-login"
              ? "দোকানের হিসাব দেখতে সরাসরি লগইন করুন"
              : "সহজ ৩ ধাপে আপনার দোকানের ডিজিটাল খাতা শুরু করুন"}
          </span>

          {/* 3 Steps Progress Indicator for Onboarding */}
          {viewMode !== "direct-login" && (
            <div className="relative mt-2 flex items-center justify-center gap-2 w-full max-w-xs">
              {[
                { step: "onboarding-1", num: "১", label: "দোকানের ধরন" },
                { step: "onboarding-2", num: "২", label: "পণ্য নির্বাচন" },
                { step: "onboarding-3", num: "৩", label: "সাইন আপ" },
              ].map((item, idx) => {
                const isActive = viewMode === item.step;
                const isPassed =
                  (item.step === "onboarding-1" && (viewMode === "onboarding-2" || viewMode === "onboarding-3")) ||
                  (item.step === "onboarding-2" && viewMode === "onboarding-3");

                return (
                  <div key={item.step} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                        isActive
                          ? "bg-white text-emerald-900 ring-2 ring-emerald-300 ring-offset-1 ring-offset-emerald-800 scale-105"
                          : isPassed
                            ? "bg-emerald-400 text-emerald-950"
                            : "bg-white/20 text-white/70"
                      )}
                    >
                      {isPassed ? "✓" : item.num}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] sm:text-[11px] leading-none whitespace-nowrap transition-colors",
                        isActive ? "font-bold text-white" : "font-medium text-emerald-100/70"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <CardContent className="bg-emerald-50/70 px-4 sm:px-6 pt-5 pb-6 dark:bg-emerald-950/20">
          {/* ================= STEP 1: SHOP TYPE SELECTION ================= */}
          {viewMode === "onboarding-1" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className={typography("h4", "text-foreground font-bold")}>
                  কোন ধরনের দোকান আপনার?
                </h2>
                <p className="text-xs text-muted-foreground">
                  সঠিক অপশনটি বেছে নিলে আপনার দোকানের উপযোগী পণ্য আগে থেকেই সাজানো থাকবে।
                </p>
              </div>

              {/* 5 Shop Type Grid Cards (2 columns on mobile and desktop) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {ONBOARDING_SHOP_TYPES.map((shop) => {
                  const isSelected = selectedShopType === shop.id;
                  return (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => handleSelectShopType(shop.id)}
                      className={cn(
                        "relative flex flex-col justify-between p-3 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] h-full min-h-[120px]",
                        isSelected
                          ? "border-emerald-600 bg-emerald-500/15 ring-2 ring-emerald-600/60 shadow-sm dark:bg-emerald-500/20"
                          : "border-border/80 bg-white/80 hover:bg-white hover:border-emerald-300 dark:bg-white/5 dark:hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-2xl shadow-inner">
                          <span aria-hidden="true">{shop.emoji}</span>
                        </div>

                        {/* Radio / Check indicator */}
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full border flex items-center justify-center transition-colors mt-0.5 shrink-0",
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-muted-foreground/40 bg-transparent"
                          )}
                        >
                          {isSelected && <span className="text-[10px] leading-none font-bold">✓</span>}
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-0.5">
                        <span className="font-bold text-[13px] sm:text-sm text-foreground leading-snug line-clamp-1 block">
                          {shop.title}
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                          {shop.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 space-y-2.5">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setViewMode("onboarding-2")}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                >
                  পরবর্তী ধাপ: পণ্য নির্বাচন ➔
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("direct-login");
                      setDirectStep("phone");
                      setErrors({});
                    }}
                    className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline inline-flex items-center gap-1"
                  >
                    ইতিমধ্যে অ্যাকাউন্ট আছে? <span>সরাসরি লগইন করুন</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: 3-COLUMN PRODUCT CHECKLIST ================= */}
          {viewMode === "onboarding-2" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5 dark:border-emerald-800/40">
                <div>
                  <h2 className="text-sm sm:text-[15px] font-bold text-foreground flex items-center gap-1.5">
                    <span>{currentShopInfo.emoji}</span>
                    <span>{currentShopInfo.shortTitle}র পণ্য নির্বাচন</span>
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    আপনার দোকানে বিক্রি হওয়া পণ্যগুলোতে টিক দিন (কমপক্ষে ১টি পণ্য আবশ্যক)।
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                      selectedProductIds.size >= 1
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white animate-pulse"
                    )}
                  >
                    {selectedProductIds.size}টি নির্বাচিত
                  </span>
                </div>
              </div>

              {/* Quick Select All / Deselect All */}
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-muted-foreground text-[11px]">
                  মোট {currentProductsList.length}টি সাধারণ পণ্যের তালিকা
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
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

              {/* 3-Column Checklist Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto p-1 rounded-xl bg-white/40 dark:bg-white/5 border border-emerald-200/40 dark:border-white/10">
                {currentProductsList.map((product) => {
                  const isChecked = selectedProductIds.has(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      className={cn(
                        "relative flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all duration-150 active:scale-95 select-none",
                        isChecked
                          ? "border-emerald-600 bg-emerald-100/70 dark:bg-emerald-500/25 ring-1 ring-emerald-500/50 shadow-sm"
                          : "border-border/70 bg-white dark:bg-white/5 opacity-75 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 w-full">
                        <span className="font-bold text-xs text-foreground leading-tight line-clamp-2">
                          {product.name}
                        </span>
                        <div
                          className={cn(
                            "h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-colors mt-0.5",
                            isChecked
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-muted-foreground/40 bg-white dark:bg-white/10"
                          )}
                        >
                          {isChecked && <span className="text-[10px] font-bold leading-none">✓</span>}
                        </div>
                      </div>

                      <div className="mt-2 pt-1 border-t border-emerald-200/40 dark:border-white/10 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                          ৳{product.sellPrice}
                        </span>
                        <span className="text-[9px] uppercase tracking-wide opacity-80">
                          {product.unit}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedProductIds.size === 0 && (
                <p role="alert" className="text-xs text-rose-600 font-medium text-center bg-rose-50 dark:bg-rose-950/30 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                  ⚠️ পরবর্তী ধাপে যেতে কমপক্ষে ১টি পণ্য নির্বাচন করুন।
                </p>
              )}

              {/* Navigation Actions */}
              <div className="pt-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewMode("onboarding-1")}
                  className="rounded-2xl shrink-0 px-4"
                >
                  ⬅️ পূর্ববর্তী
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={selectedProductIds.size === 0}
                  onClick={() => {
                    if (selectedProductIds.size >= 1) {
                      setViewMode("onboarding-3");
                    }
                  }}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                >
                  পরবর্তী ধাপ: সাইন আপ ➔
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SIGNUP FORM ================= */}
          {viewMode === "onboarding-3" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-100/60 dark:bg-emerald-900/30 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentShopInfo.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-tight">
                      {currentShopInfo.shortTitle}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedProductIds.size}টি প্রারম্ভিক পণ্য নির্বাচিত
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("onboarding-2")}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline px-2 py-1"
                >
                  পরিবর্তন ✏️
                </button>
              </div>

              <form onSubmit={handleOnboardingSignup} className="space-y-3.5" noValidate>
                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone" className={typography("body-strong")}>
                    মোবাইল নম্বর
                  </Label>
                  <div className="flex">
                    <span className="inline-flex h-11 shrink-0 select-none items-center rounded-l-2xl border border-r-0 border-input bg-white px-3 text-sm font-semibold text-muted-foreground dark:bg-white/10">
                      +88
                    </span>
                    <Input
                      id="signup-phone"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel-national"
                      autoFocus
                      maxLength={11}
                      placeholder="01XXXXXXXXX"
                      value={signupPhone}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "");
                        if (v.length === 10 && v[0] !== "0") v = `0${v}`;
                        v = v.slice(0, 11);
                        setSignupPhone(v);
                        if (errors.phone || errors.form)
                          setErrors((prev) => ({ ...prev, phone: undefined, form: undefined }));
                      }}
                      className={cn(
                        "h-11 rounded-l-none rounded-r-2xl bg-white text-[15px] dark:bg-white/10",
                        (errors.phone || errors.form) && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </div>
                  {errors.phone && (
                    <p className={typography("muted", "text-destructive text-xs")}>{errors.phone}</p>
                  )}
                </div>

                {/* 4-digit PIN */}
                <div className="space-y-1.5">
                  <Label htmlFor="signup-pin" className={typography("body-strong")}>
                    ৪ সংখ্যার নতুন পিন সেট করুন
                  </Label>
                  <InputOTP
                    id="signup-pin"
                    maxLength={4}
                    value={signupPin}
                    onChange={(v) => {
                      setSignupPin(v);
                      if (errors.pin || errors.form)
                        setErrors((prev) => ({ ...prev, pin: undefined, form: undefined }));
                    }}
                    pattern="^[0-9]+$"
                    inputMode="numeric"
                  >
                    <InputOTPGroup className="w-full grid grid-cols-4 gap-2.5">
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

                {/* Confirm PIN */}
                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm-pin" className={typography("body-strong")}>
                    পিন নিশ্চিত করুন
                  </Label>
                  <InputOTP
                    id="signup-confirm-pin"
                    maxLength={4}
                    value={signupConfirmPin}
                    onChange={(v) => {
                      setSignupConfirmPin(v);
                      if (errors.confirmPin || errors.form)
                        setErrors((prev) => ({ ...prev, confirmPin: undefined, form: undefined }));
                    }}
                    pattern="^[0-9]+$"
                    inputMode="numeric"
                  >
                    <InputOTPGroup className="w-full grid grid-cols-4 gap-2.5">
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

                {errors.form && (
                  <p role="alert" className={typography("muted", "text-destructive text-xs text-center")}>
                    {errors.form}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setViewMode("onboarding-2")}
                    className="rounded-2xl shrink-0 px-4"
                  >
                    ⬅️ পূর্ববর্তী
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                  >
                    {submitting ? "প্রস্তুত হচ্ছে…" : "অ্যাকাউন্ট তৈরি করুন ও শুরু করুন"}
                  </Button>
                </div>

                {/* Demo fallback */}
                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden>
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className={typography("muted", "bg-emerald-50/70 dark:bg-emerald-950 px-2 text-xs")}>
                        অথবা
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 rounded-2xl text-xs sm:text-sm font-semibold border-emerald-300 dark:border-emerald-800"
                    onClick={handleOnboardingDemo}
                  >
                    <span aria-hidden="true">▶️</span>
                    ডেমো হিসেবে এখনই শুরু করুন (লগইন ছাড়া)
                  </Button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("direct-login");
                      setDirectStep("phone");
                      setErrors({});
                    }}
                    className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline inline-flex items-center gap-1"
                  >
                    ইতিমধ্যে অ্যাকাউন্ট আছে? <span>সরাসরি লগইন করুন</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= DIRECT LOGIN VIEW (FOR RETURNING USERS) ================= */}
          {viewMode === "direct-login" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60 dark:border-emerald-800/40">
                <h2 className="text-sm font-bold text-foreground">সরাসরি লগইন</h2>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("onboarding-1");
                    setErrors({});
                  }}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  <span>✨ নতুন অনবোর্ডিং শুরু করুন</span>
                </button>
              </div>

              {directStep === "phone" ? (
                <form onSubmit={handleDirectPhoneSubmit} className="space-y-3.5" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="direct-phone" className={typography("body-strong")}>
                      মোবাইল নম্বর
                    </Label>
                    <div className="flex">
                      <span className="inline-flex h-12 shrink-0 select-none items-center rounded-l-2xl border border-r-0 border-input bg-white px-3.5 text-sm font-semibold text-muted-foreground dark:bg-white/10">
                        +88
                      </span>
                      <Input
                        id="direct-phone"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="tel-national"
                        autoFocus
                        maxLength={11}
                        placeholder="01XXXXXXXXX"
                        value={directPhone}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "");
                          if (v.length === 10 && v[0] !== "0") v = `0${v}`;
                          v = v.slice(0, 11);
                          setDirectPhone(v);
                          if (errors.phone || errors.form)
                            setErrors((prev) => ({ ...prev, phone: undefined, form: undefined }));
                        }}
                        className={cn(
                          "h-12 rounded-l-none rounded-r-2xl bg-white text-[15px] dark:bg-white/10",
                          (errors.phone || errors.form) && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    {errors.phone && (
                      <p className={typography("muted", "text-destructive text-xs")}>{errors.phone}</p>
                    )}
                  </div>

                  {errors.form && (
                    <p role="alert" className={typography("muted", "text-destructive text-xs text-center")}>
                      {errors.form}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={checkingPhone}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                  >
                    {checkingPhone ? "যাচাই হচ্ছে…" : "পরবর্তী"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleDirectLogin} className="space-y-3.5" noValidate>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectStep("phone");
                      setDirectPin("");
                      setErrors({});
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <span>⬅️ +88{directPhone} পরিবর্তন করুন</span>
                  </button>

                  <div className="space-y-1.5">
                    <Label htmlFor="direct-pin" className={typography("body-strong")}>
                      আপনার ৪ সংখ্যার পিন দিন
                    </Label>
                    <InputOTP
                      id="direct-pin"
                      maxLength={4}
                      value={directPin}
                      onChange={(v) => {
                        setDirectPin(v);
                        if (errors.pin || errors.form)
                          setErrors((prev) => ({ ...prev, pin: undefined, form: undefined }));
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

                  {errors.form && (
                    <p role="alert" className={typography("muted", "text-destructive text-xs text-center")}>
                      {errors.form}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                  >
                    {submitting ? "লগইন হচ্ছে…" : "লগইন করুন"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;
