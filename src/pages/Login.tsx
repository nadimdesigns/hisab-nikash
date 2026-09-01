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

const credentialsSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, { message: "সঠিক মোবাইল নম্বর দিন (যেমন: 01712345678)" }),
  pin: z
    .string()
    .regex(/^\d{4}$/, { message: "পিন ৪ সংখ্যার হতে হবে" }),
});

type FieldErrors = {
  phone?: string;
  pin?: string;
  form?: string;
};

type Mode = "login" | "signup";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  const [mode, setMode] = useState<Mode>("signup");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
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
   * Demo sandbox removed (owner instruction, Aug 2026) — the app is
   * admin-only now. Sign in with a real phone + PIN account.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = credentialsSchema.safeParse({ phone, pin });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmailFor(parsed.data.phone),
          password: authPasswordFor(parsed.data.pin),
        });
        if (error) {
          setErrors({ form: mapAuthError(error.message) });
        } else {
          toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmailFor(parsed.data.phone),
          password: authPasswordFor(parsed.data.pin),
        });
        if (error) {
          setErrors({ form: mapAuthError(error.message) });
        } else {
          toast({ title: "অ্যাকাউন্ট তৈরি হয়েছে", description: "আপনি এখন লগইন করা আছেন।" });
          navigate(from, { replace: true });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          <span className="relative mt-1 text-[13px] text-white/80 text-center">
            {mode === "login"
              ? "দোকানের হিসাব দেখতে লগইন করুন।"
              : "শুরু করতে একটি অ্যাকাউন্ট খুলুন।"}
          </span>
        </div>
        <CardContent className="bg-emerald-50 px-6 pt-6 pb-7 dark:bg-emerald-950/30">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                aria-invalid={!!(errors.pin || errors.form)}
              >
                <InputOTPGroup className="w-full grid grid-cols-4 gap-3">
                  <InputOTPSlot index={0} className={cn("h-auto aspect-square w-full rounded-2xl border border-input bg-white text-lg font-semibold shadow-sm dark:bg-white/10", errors.pin && "border-destructive text-destructive")} />
                  <InputOTPSlot index={1} className={cn("h-auto aspect-square w-full rounded-2xl border border-input bg-white text-lg font-semibold shadow-sm dark:bg-white/10", errors.pin && "border-destructive text-destructive")} />
                  <InputOTPSlot index={2} className={cn("h-auto aspect-square w-full rounded-2xl border border-input bg-white text-lg font-semibold shadow-sm dark:bg-white/10", errors.pin && "border-destructive text-destructive")} />
                  <InputOTPSlot index={3} className={cn("h-auto aspect-square w-full rounded-2xl border border-input bg-white text-lg font-semibold shadow-sm dark:bg-white/10", errors.pin && "border-destructive text-destructive")} />
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

            <Button type="submit" size="lg" className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-400 font-semibold shadow-lg shadow-emerald-600/25 transition-transform hover:from-emerald-600 hover:via-emerald-500 hover:to-lime-300 active:scale-[0.98]" disabled={submitting}>
              {submitting
                ? mode === "login" ? "লগইন হচ্ছে…" : "অ্যাকাউন্ট তৈরি হচ্ছে…"
                : mode === "login" ? "লগইন" : "অ্যাকাউন্ট খুলুন"}
            </Button>

            <p className={typography("muted", "text-center")}>
              {mode === "login" ? "অ্যাকাউন্ট নেই?" : "অ্যাকাউন্ট আছে?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "login" ? "signup" : "login"));
                  setErrors({});
                }}
                className="font-medium text-primary hover:underline"
              >
                {mode === "login" ? "অ্যাকাউন্ট খুলুন" : "লগইন"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;
