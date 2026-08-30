import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "@/hooks/use-toast";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { PlayCircle } from "lucide-react";
import { BrandLockup } from "@/components/BrandLogo";
import { enableDemoMode, setCachedRole } from "@/lib/demoMode";

// Supabase auth is email+password under the hood (phone auth is not enabled
// on the project), but the app's login/signup is a BD mobile number + a
// 4-digit PIN per explicit owner instruction. Map the phone to a synthetic
// email so the existing Supabase email/password flow keeps working.
const PHONE_DOMAIN = "hisabnikash.app";
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

  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotError, setForgotError] = useState<string | undefined>(undefined);
  const [forgotSent, setForgotSent] = useState(false);

  // Redirect when authenticated.
  useEffect(() => {
    if (!loading && session) {
      navigate(from, { replace: true });
    }
  }, [loading, session, from, navigate]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = z.string().trim().regex(/^01[3-9]\d{8}$/, { message: "সঠিক মোবাইল নম্বর দিন" }).safeParse(forgotPhone);
    if (!result.success) {
      setForgotError(result.error.issues[0]?.message ?? "সঠিক মোবাইল নম্বর দিন");
      return;
    }
    setForgotError(undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmailFor(result.data), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setForgotError(error.message);
      return;
    }
    setForgotSent(true);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setTimeout(() => {
      setForgotPhone("");
      setForgotError(undefined);
      setForgotSent(false);
    }, 150);
  };

  /**
   * Enter the demo sandbox. Purely client-side — no backend call. Every
   * persisted key gets a `demo:` prefix, so this cannot touch real data.
   */
  const loginAsDemo = () => {
    enableDemoMode();
    // A previous real login may have cached a `demo` server role, which the
    // write guard still honours. Clear it, or the sandbox would open
    // read-only for no reason the visitor can see.
    setCachedRole(null);
    window.dispatchEvent(new Event("pharmasee-demo-changed"));
    toast({ title: "ডেমো মোড", description: "নমুনা তথ্য দিয়ে অ্যাপটি ঘুরে দেখুন।" });
    // Reload so persisted stores re-init under the demo namespace.
    window.location.replace(from);
  };

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
          setErrors({ form: error.message });
        } else {
          toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmailFor(parsed.data.phone),
          password: authPasswordFor(parsed.data.pin),
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          setErrors({ form: error.message });
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
      <Card className="w-full max-w-sm shadow-soft">
        <CardHeader className="items-center text-center space-y-px">
          <BrandLockup className="mb-3" iconClassName="h-11 w-11" withTagline />
          <CardDescription>
            {mode === "login"
              ? "দোকানের হিসাব দেখতে লগইন করুন।"
              : "শুরু করতে একটি অ্যাকাউন্ট খুলুন।"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="phone" className={typography("body-strong")}>মোবাইল নম্বর</Label>
              <div className="flex">
                <span className="inline-flex h-10 shrink-0 select-none items-center rounded-l-md border border-r-0 border-input bg-muted/50 px-3 text-sm font-semibold text-muted-foreground">
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
                  className={cn("rounded-l-none", (errors.phone || errors.form) && "border-destructive focus-visible:ring-destructive")}
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
                <InputOTPGroup>
                  <InputOTPSlot index={0} className={cn(errors.pin && "border-destructive text-destructive")} />
                  <InputOTPSlot index={1} className={cn(errors.pin && "border-destructive text-destructive")} />
                  <InputOTPSlot index={2} className={cn(errors.pin && "border-destructive text-destructive")} />
                  <InputOTPSlot index={3} className={cn(errors.pin && "border-destructive text-destructive")} />
                </InputOTPGroup>
              </InputOTP>
              {errors.pin && (
                <p id="pin-error" className={typography("muted", "text-destructive")}>
                  {errors.pin}
                </p>
              )}
            </div>

            {mode === "login" && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  পিন ভুলে গেছেন?
                </button>
              </div>
            )}

            {errors.form && (
              <p role="alert" className={typography("muted", "text-destructive text-center")}>
                {errors.form}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting
                ? mode === "login" ? "Logging in…" : "Creating account…"
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

            {mode === "login" && (
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

                <p className={typography("muted", "text-center text-[11px]")}>
                  নমুনা তথ্য দিয়ে অ্যাপটি ঘুরে দেখুন — বিক্রি, বাকি ও স্টক সবই যোগ করা যাবে।
                  আপনার আসল তথ্য আলাদা থাকবে।
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={(open) => (open ? setForgotOpen(true) : closeForgot())}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>পিন রিসেট</DialogTitle>
            <DialogDescription>
              {forgotSent
                ? "If an account exists for that phone number, PIN reset instructions are on their way."
                : "Enter the phone number associated with your account and we'll send reset instructions."}
            </DialogDescription>
          </DialogHeader>
          {forgotSent ? (
            <DialogFooter>
              <Button type="button" className="w-full" onClick={closeForgot}>
                Done
              </Button>
            </DialogFooter>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="forgot-phone">মোবাইল নম্বর</Label>
                <Input
                  id="forgot-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={11}
                  value={forgotPhone}
                  onChange={(e) => {
                    setForgotPhone(e.target.value.replace(/\D/g, "").slice(0, 11));
                    if (forgotError) setForgotError(undefined);
                  }}
                  placeholder="01XXXXXXXXX"
                  aria-invalid={!!forgotError}
                  aria-describedby={forgotError ? "forgot-phone-error" : undefined}
                  className={cn(forgotError && "border-destructive focus-visible:ring-destructive")}
                />
                {forgotError && (
                  <p id="forgot-phone-error" className={typography("muted", "text-destructive")}>
                    {forgotError}
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={closeForgot}>
                  Cancel
                </Button>
                <Button type="submit">Send reset link</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Login;
