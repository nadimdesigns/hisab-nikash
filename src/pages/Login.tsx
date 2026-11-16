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
import { APP_NAME } from "@/lib/copy";
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

// 4 Clean Steps:
// 1) "step-1-shop": Shop Type Selection (2-column grid)
// 2) "step-2-products": Product Selection (3-column checklist, min 1 item)
// 3) "step-3-phone": Mobile number input (checks if registered or new)
// 4) "step-4-pin": PIN input (1 PIN for registered, 2-stage progressive PIN for new)
type Step = "step-1-shop" | "step-2-products" | "step-3-phone" | "step-4-pin";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  // Flow State
  const [step, setStep] = useState<Step>("step-1-shop");
  const [selectedShopType, setSelectedShopType] = useState<ShopType>("grocery");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => {
    return new Set(SHOP_TYPE_PRODUCTS["grocery"].map((p) => p.id));
  });

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

  // Step 3: Handle Phone Submit & Check Account Status
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
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
        // Fallback: proceed to PIN setup
        setIsExistingAccount(false);
      } else {
        setIsExistingAccount(!!data);
      }
      setPin("");
      setConfirmPin("");
      setStep("step-4-pin");
    } catch {
      setIsExistingAccount(false);
      setPin("");
      setConfirmPin("");
      setStep("step-4-pin");
    } finally {
      setCheckingPhone(false);
    }
  };

  // Step 4: Handle PIN verification / Account Creation
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPin = pinSchema.safeParse(pin);
    if (!parsedPin.success) {
      setErrors({ pin: parsedPin.error.issues[0]?.message });
      return;
    }

    // If new account, check confirm PIN
    if (!isExistingAccount) {
      if (confirmPin.length !== 4) {
        setErrors({ confirmPin: "৪ সংখ্যার নিশ্চিতকরণ পিন দিন।" });
        return;
      }
      if (confirmPin !== pin) {
        setErrors({ confirmPin: "পিন দুটি মিলছে না।" });
        return;
      }
    }

    setErrors({});
    setSubmitting(true);

    try {
      if (isExistingAccount) {
        // Existing user login
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmailFor(phone),
          password: authPasswordFor(parsedPin.data),
        });
        if (error) {
          setErrors({ form: mapAuthError(error.message) });
        } else {
          toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
          navigate(from, { replace: true });
        }
      } else {
        // New user signup
        const chosenTemplates = SHOP_TYPE_PRODUCTS[selectedShopType].filter((p) =>
          selectedProductIds.has(p.id)
        );
        seedCustomShopProducts(chosenTemplates, selectedShopType, false);

        const { data, error } = await supabase.auth.signUp({
          email: authEmailFor(phone),
          password: authPasswordFor(parsedPin.data),
        });

        if (error) {
          setErrors({ form: mapAuthError(error.message) });
        } else if (data.session) {
          toast({
            title: "স্বাগতম!",
            description: `আপনার দোকান ও ${chosenTemplates.length}টি পণ্য প্রস্তুত করা হয়েছে।`,
          });
          navigate(from, { replace: true });
        } else {
          // If already registered under Supabase
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: authEmailFor(phone),
            password: authPasswordFor(parsedPin.data),
          });
          if (signInError) {
            setIsExistingAccount(true);
            setErrors({ form: "এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। সঠিক পিন দিন।" });
          } else {
            toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
            navigate(from, { replace: true });
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Demo account flow with chosen shop type and products
  const handleStartDemo = () => {
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
        {/* Lean Splash Header without Step Pills */}
        <div className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 px-5 pt-6 pb-5 flex flex-col items-center gap-1.5 overflow-hidden text-center">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 pointer-events-none" aria-hidden />
          <div className="absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-white/10 pointer-events-none" aria-hidden />

          <img
            src="/logo.webp"
            alt={APP_NAME}
            className="relative h-[60px] w-[60px] object-contain shadow-md shadow-emerald-950/40 rounded-2xl"
          />
          <span className="relative text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
            {APP_NAME}
          </span>
          <span className="relative text-xs text-emerald-100/80">
            দোকানের সহজ ডিজিটাল খাতা
          </span>
        </div>

        <CardContent className="bg-emerald-50/70 px-4 sm:px-6 pt-5 pb-6 dark:bg-emerald-950/20">
          {/* ================= STEP 1: SHOP TYPE SELECTION ================= */}
          {step === "step-1-shop" && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className={typography("h4", "text-foreground font-bold")}>
                  দোকানের ধরন বেছে নিন
                </h2>
              </div>

              {/* 5 Shop Type Grid Cards (2 columns) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {ONBOARDING_SHOP_TYPES.map((shop) => {
                  const isSelected = selectedShopType === shop.id;
                  return (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => handleSelectShopType(shop.id)}
                      className={cn(
                        "relative flex flex-col justify-between p-3 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] h-full min-h-[115px]",
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

                      <div className="mt-2 space-y-0.5">
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

              {/* Action Buttons: Full width Primary + Center-aligned Ghost */}
              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setStep("step-2-products")}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                >
                  পরবর্তী ধাপ ➔
                </Button>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep("step-3-phone");
                      setErrors({});
                    }}
                    className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-transparent hover:underline"
                  >
                    ইতিমধ্যে অ্যাকাউন্ট আছে? সরাসরি লগইন করুন
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PRODUCT SELECTION ================= */}
          {step === "step-2-products" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5 dark:border-emerald-800/40">
                <h2 className="text-sm sm:text-[15px] font-bold text-foreground flex items-center gap-1.5">
                  <span>{currentShopInfo.emoji}</span>
                  <span>{currentShopInfo.shortTitle}র পণ্য</span>
                </h2>

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

              {/* Quick Select All / Deselect All */}
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-muted-foreground text-[11px]">
                  মোট {currentProductsList.length}টি সাধারণ পণ্য
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
                  ⚠️ কমপক্ষে ১টি পণ্য নির্বাচন করুন।
                </p>
              )}

              {/* Action Buttons: Full width Primary + Center-aligned Ghost */}
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
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                >
                  পরবর্তী ধাপ ➔
                </Button>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("step-1-shop")}
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
                  onClick={() => setStep("step-2-products")}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline px-2 py-1"
                >
                  পরিবর্তন ✏️
                </button>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-3.5" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className={typography("body-strong")}>
                    মোবাইল নম্বর
                  </Label>
                  <div className="flex">
                    <span className="inline-flex h-12 shrink-0 select-none items-center rounded-l-2xl border border-r-0 border-input bg-white px-3.5 text-sm font-semibold text-muted-foreground dark:bg-white/10">
                      +88
                    </span>
                    <Input
                      id="phone"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel-national"
                      autoFocus
                      maxLength={11}
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "");
                        if (v.length === 10 && v[0] !== "0") v = `0${v}`;
                        v = v.slice(0, 11);
                        setPhone(v);
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

                {/* Action Buttons: Full width Primary + Center-aligned Ghost */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={checkingPhone}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                  >
                    {checkingPhone ? "যাচাই হচ্ছে…" : "পরবর্তী ধাপ ➔"}
                  </Button>

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep("step-2-products")}
                      className="text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
                    >
                      ← পূর্ববর্তী ধাপে যান
                    </Button>
                  </div>
                </div>

                {/* Demo option */}
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
                    onClick={handleStartDemo}
                  >
                    <span aria-hidden="true">▶️</span>
                    ডেমো হিসেবে এখনই শুরু করুন (লগইন ছাড়া)
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ================= STEP 4: PIN VERIFICATION / CREATION ================= */}
          {step === "step-4-pin" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className={typography("h4", "text-foreground font-bold")}>
                  {isExistingAccount ? "পিন নম্বর দিন" : "নতুন পিন সেট করুন"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  +88{phone}
                </p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-4" noValidate>
                {isExistingAccount ? (
                  /* Existing user: Single PIN input */
                  <div className="space-y-2">
                    <Label htmlFor="pin" className={typography("body-strong")}>
                      আপনার ৪ সংখ্যার পিন
                    </Label>
                    <InputOTP
                      id="pin"
                      maxLength={4}
                      value={pin}
                      onChange={(v) => {
                        setPin(v);
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
                ) : (
                  /* New user: Progressive 2-stage PIN (1st PIN entered -> then reveal Confirm PIN underneath) */
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="pin" className={typography("body-strong")}>
                        ৪ সংখ্যার নতুন পিন
                      </Label>
                      <InputOTP
                        id="pin"
                        maxLength={4}
                        value={pin}
                        onChange={(v) => {
                          setPin(v);
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

                    {/* Step 4b: Confirm PIN revealed smoothly only when first PIN is complete (4 digits) */}
                    {pin.length === 4 && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label htmlFor="confirmPin" className={typography("body-strong")}>
                          পিন নিশ্চিত করুন
                        </Label>
                        <InputOTP
                          id="confirmPin"
                          maxLength={4}
                          value={confirmPin}
                          onChange={(v) => {
                            setConfirmPin(v);
                            if (errors.confirmPin || errors.form)
                              setErrors((prev) => ({ ...prev, confirmPin: undefined, form: undefined }));
                          }}
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
                  </div>
                )}

                {errors.form && (
                  <p role="alert" className={typography("muted", "text-destructive text-xs text-center")}>
                    {errors.form}
                  </p>
                )}

                {/* Action Buttons: Full width Primary + Center-aligned Ghost */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting || (!isExistingAccount && (pin.length !== 4 || confirmPin.length !== 4))}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold text-white shadow-md hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                  >
                    {submitting
                      ? "প্রক্রিয়াকরণ হচ্ছে…"
                      : isExistingAccount
                        ? "লগইন করুন ➔"
                        : "অ্যাকাউন্ট তৈরি করুন ➔"}
                  </Button>

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep("step-3-phone");
                        setPin("");
                        setConfirmPin("");
                        setErrors({});
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
                    >
                      ← নম্বর পরিবর্তন করুন
                    </Button>
                  </div>
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
