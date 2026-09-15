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
import { ArrowLeft, PlayCircle } from "lucide-react";
import { enableDemoMode, setCachedRole } from "@/lib/demoMode";
import { seedDemoCustomers } from "@/lib/demoSeed";

// Supabase auth is email+password under the hood (phone auth is not enabled
// on the project), but the app's login/signup is a BD mobile number + a
// 4-digit PIN per explicit owner instruction. Map the phone to a synthetic
// email so the existing Supabase email/password flow keeps working.
// Supabase rejected the `.app` synthetic domain with "Email address is
// invalid" (verified live Aug 2026) — switched to a plain `.com` domain.
const PHONE_DOMAIN = "hisabnikash.com";
const authEmailFor = (phone: string) => `${phone.replace(/\D/g, "")}@${PHONE_DOMAIN}`;
// Supabase's default minimum password length is 6, so a bare 4-digit PIN
// would be rejected at signup. Derive a stable 6-char secret ("H1" + PIN)
// identically on signup and login -- the user only ever types the 4 digits.
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

// The flow is phone-first and unified: step 1 just collects the number, then
// step 2 shape depends on whether that number already has an account --
// "existing" asks for the one PIN to log in, "new" asks the user to create
// and confirm a PIN to sign up. There is no separate login/signup form.
type Step = "phone" | "existing" | "new";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});

  // Redirect when authenticated.
  useEffect(() => {
    if (!loading && session) {
      navigate(from, { replace: true });
    }
  }, [loading, session, from, navigate]);

  // Supabase errors are email-flavoured — surface them as phone/PIN messages.
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

  /**
   * Enter the demo sandbox. Purely client-side — no backend call. Every
   * persisted key gets a `demo:` prefix, so this cannot touch real data.
   */
  const loginAsDemo = () => {
    enableDemoMode();
    setCachedRole(null);
    // Seed the ENTIRE demo dataset directly (store blob + profiles + dues),
    // so the reload always lands on fresh, complete sample data.
    seedDemoCustomers();
    window.dispatchEvent(new Event("pharmasee-demo-changed"));
    toast({ title: "ডেমো মোড", description: "নমুনা তথ্য দিয়ে অ্যাপটি ঘুরে দেখুন।" });
    window.location.replace("/");
  };

  const goBackToPhone = () => {
    setStep("phone");
    setPin("");
    setConfirmPin("");
    setErrors({});
  };

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
        setErrors({ form: "একটু সমস্যা হয়েছে, আবার চেষ্টা করুন।" });
        return;
      }
      setStep(data ? "existing" : "new");
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pinSchema.safeParse(pin);
    if (!parsed.success) {
      setErrors({ pin: parsed.error.issues[0]?.message });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmailFor(phone),
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPin = pinSchema.safeParse(pin);
    if (!parsedPin.success) {
      setErrors({ pin: parsedPin.error.issues[0]?.message });
      return;
    }
    if (confirmPin !== pin) {
      setErrors({ confirmPin: "পিন দুটি মিলছে না" });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmailFor(phone),
        password: authPasswordFor(parsedPin.data),
      });
      if (error) {
        setErrors({ form: mapAuthError(error.message) });
      } else if (data.session) {
        toast({ title: "অ্যাকাউন্ট তৈরি হয়েছে", description: "আপনি এখন লগইন করা আছেন।" });
        navigate(from, { replace: true });
      } else {
        // Supabase returns a "successful" signup with no session and no
        // error when the phone is already registered (anti-enumeration
        // behavior) -- try logging in with the same PIN instead of leaving
        // the user stranded on a fake "account created" state.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmailFor(phone),
          password: authPasswordFor(parsedPin.data),
        });
        if (signInError) {
          setStep("existing");
          setConfirmPin("");
          setErrors({ form: "এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। সঠিক পিন দিয়ে লগইন করুন।" });
        } else {
          toast({ title: "স্বাগতম", description: "এই নম্বরে অ্যাকাউন্ট আগে থেকেই আছে, লগইন করা হয়েছে।" });
          navigate(from, { replace: true });
        }
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

  const subtitle =
    step === "phone"
      ? "শুরু করতে আপনার মোবাইল নম্বর দিন।"
      : step === "existing"
        ? "দোকানের হিসাব দেখতে পিন দিন।"
        : "একটি নতুন পিন তৈরি করুন।";

  return (
    <main className="fixed inset-0 h-[100svh] w-full bg-background flex items-center justify-center p-4 overflow-y-auto [padding-top:max(1rem,env(safe-area-inset-top))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
      <Card className="w-full max-w-sm rounded-[28px] border-0 shadow-elevated overflow-hidden">
        {/* Playful gradient header: logo centered (1.7x), name + tagline
            stacked vertically below it, per explicit owner instruction. */}
        <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-yellow-500 px-6 pt-10 pb-8 flex flex-col items-center gap-2.5 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <img
            src="/logo.png"
            alt={APP_NAME}
            className="relative h-[96px] w-[96px] object-contain shadow-lg shadow-teal-900/30"
          />
          <span className="relative text-xl font-bold text-white leading-tight">{APP_NAME}</span>
          <span className="relative -mt-1 text-sm text-white/85">{APP_TAGLINE}</span>
          <span className="relative mt-1 text-[13px] text-white/80 text-center">{subtitle}</span>
        </div>
        <CardContent className="bg-emerald-50 px-6 pt-6 pb-7 dark:bg-emerald-950/30">
          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="phone" className={typography("body-strong")}>মোবাইল নম্বর</Label>
                <div className="flex">
                  <span className="inline-flex h-12 shrink-0 select-none items-center rounded-l-2xl border border-r-0 border-input bg-white px-3.5 text-sm font-semibold text-muted-foreground dark:bg-white/10">
                    +88
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    autoFocus
                    maxLength={11}
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setPhone(v);
                      if (errors.phone || errors.form) setErrors((prev) => ({ ...prev, phone: undefined, form: undefined }));
                    }}
                    aria-invalid={!!(errors.phone || errors.form)}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    className={cn("h-12 rounded-l-none rounded-r-2xl bg-white text-[15px] dark:bg-white/10", (errors.phone || errors.form) && "border-destructive focus-visible:ring-destructive")}
                  />
                </div>
                {errors.phone && (
                  <p id="phone-error" className={typography("muted", "text-destructive")}>
                    {errors.phone}
                  </p>
                )}
              </div>

              {errors.form && (
                <p role="alert" className={typography("muted", "text-destructive text-center")}>
                  {errors.form}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold transition-transform hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]" disabled={checkingPhone}>
                {checkingPhone ? "যাচাই হচ্ছে…" : "পরবর্তী"}
              </Button>

              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className={typography("muted", "bg-card px-2")}>অথবা</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={loginAsDemo}
                >
                  <PlayCircle className="h-4 w-4" />
                  ডেমো অ্যাকাউন্ট দিয়ে দেখুন
                </Button>
              </div>
            </form>
          ) : step === "existing" ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <button
                type="button"
                onClick={goBackToPhone}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                +88{phone}
              </button>

              <div className="space-y-2">
                <Label htmlFor="pin" className={typography("body-strong")}>পিন (৪ সংখ্যা)</Label>
                <InputOTP
                  id="pin"
                  maxLength={4}
                  value={pin}
                  onChange={(v) => {
                    setPin(v);
                    if (errors.pin || errors.form) setErrors((prev) => ({ ...prev, pin: undefined, form: undefined }));
                  }}
                  pattern="^[0-9]+$"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  aria-invalid={!!(errors.pin || errors.form)}
                >
                  <InputOTPGroup className="w-full grid grid-cols-4 gap-3">
                    <InputOTPSlot index={0} className={otpSlotClass(errors.pin)} />
                    <InputOTPSlot index={1} className={otpSlotClass(errors.pin)} />
                    <InputOTPSlot index={2} className={otpSlotClass(errors.pin)} />
                    <InputOTPSlot index={3} className={otpSlotClass(errors.pin)} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.pin && (
                  <p id="pin-error" className={typography("muted", "text-destructive")}>
                    {errors.pin}
                  </p>
                )}
              </div>

              {errors.form && (
                <p role="alert" className={typography("muted", "text-destructive text-center")}>
                  {errors.form}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold transition-transform hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]" disabled={submitting}>
                {submitting ? "লগইন হচ্ছে…" : "লগইন"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4" noValidate>
              <button
                type="button"
                onClick={goBackToPhone}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                +88{phone}
              </button>

              <div className="space-y-2">
                <Label htmlFor="pin" className={typography("body-strong")}>নতুন পিন তৈরি করুন</Label>
                <InputOTP
                  id="pin"
                  maxLength={4}
                  value={pin}
                  onChange={(v) => {
                    setPin(v);
                    if (errors.pin || errors.form) setErrors((prev) => ({ ...prev, pin: undefined, form: undefined }));
                  }}
                  pattern="^[0-9]+$"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  aria-invalid={!!(errors.pin || errors.form)}
                >
                  <InputOTPGroup className="w-full grid grid-cols-4 gap-3">
                    <InputOTPSlot index={0} className={otpSlotClass(errors.pin)} />
                    <InputOTPSlot index={1} className={otpSlotClass(errors.pin)} />
                    <InputOTPSlot index={2} className={otpSlotClass(errors.pin)} />
                    <InputOTPSlot index={3} className={otpSlotClass(errors.pin)} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.pin && (
                  <p id="pin-error" className={typography("muted", "text-destructive")}>
                    {errors.pin}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPin" className={typography("body-strong")}>পিন নিশ্চিত করুন</Label>
                <InputOTP
                  id="confirmPin"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(v) => {
                    setConfirmPin(v);
                    if (errors.confirmPin || errors.form) setErrors((prev) => ({ ...prev, confirmPin: undefined, form: undefined }));
                  }}
                  pattern="^[0-9]+$"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-invalid={!!(errors.confirmPin || errors.form)}
                >
                  <InputOTPGroup className="w-full grid grid-cols-4 gap-3">
                    <InputOTPSlot index={0} className={otpSlotClass(errors.confirmPin)} />
                    <InputOTPSlot index={1} className={otpSlotClass(errors.confirmPin)} />
                    <InputOTPSlot index={2} className={otpSlotClass(errors.confirmPin)} />
                    <InputOTPSlot index={3} className={otpSlotClass(errors.confirmPin)} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.confirmPin && (
                  <p id="confirm-pin-error" className={typography("muted", "text-destructive")}>
                    {errors.confirmPin}
                  </p>
                )}
              </div>

              {errors.form && (
                <p role="alert" className={typography("muted", "text-destructive text-center")}>
                  {errors.form}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 font-semibold transition-transform hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400 active:scale-[0.98]" disabled={submitting}>
                {submitting ? "অ্যাকাউন্ট তৈরি হচ্ছে…" : "অ্যাকাউন্ট খুলুন"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;
