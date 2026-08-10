import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { Eye, EyeOff, PlayCircle } from "lucide-react";
import { BrandLockup } from "@/components/BrandLogo";
import { DEMO_USERNAME, DEMO_PASSWORD, enableDemoMode, setCachedRole } from "@/lib/demoMode";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "সঠিক ইমেইল দিন" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(128, { message: "Password must be less than 128 characters" }),
});

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

type Mode = "login" | "signup";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
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
    const result = z.string().trim().email({ message: "সঠিক ইমেইল দিন" }).safeParse(forgotEmail);
    if (!result.success) {
      setForgotError(result.error.issues[0]?.message ?? "সঠিক ইমেইল দিন");
      return;
    }
    setForgotError(undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(result.data, {
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
      setForgotEmail("");
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

    if (mode === "login" && email.trim().toLowerCase() === DEMO_USERNAME && password === DEMO_PASSWORD) {
      loginAsDemo();
      return;
    }

    const parsed = credentialsSchema.safeParse({ email, password });
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
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          setErrors({ form: error.message });
        } else {
          toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
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
              <Label htmlFor="email" className={typography("body-strong")}>ইমেইল</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email || errors.form) setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
                }}
                aria-invalid={!!(errors.email || errors.form)}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={cn((errors.email || errors.form) && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.email && (
                <p id="email-error" className={typography("muted", "text-destructive")}>
                  {errors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className={typography("body-strong")}>পাসওয়ার্ড</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password || errors.form) setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                  }}
                  aria-invalid={!!(errors.password || errors.form)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={cn("pr-10", (errors.password || errors.form) && "border-destructive focus-visible:ring-destructive")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className={typography("muted", "text-destructive")}>
                  {errors.password}
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
                  পাসওয়ার্ড ভুলে গেছেন?
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
                  <br />
                  ইউজারনেম <span className="font-medium text-foreground">{DEMO_USERNAME}</span>
                  {" · "}পাসওয়ার্ড <span className="font-medium text-foreground">{DEMO_PASSWORD}</span>
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={(open) => (open ? setForgotOpen(true) : closeForgot())}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>পাসওয়ার্ড রিসেট</DialogTitle>
            <DialogDescription>
              {forgotSent
                ? "If an account exists for that email, password reset instructions are on their way."
                : "Enter the email associated with your account and we'll send reset instructions."}
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
                <Label htmlFor="forgot-email">ইমেইল</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    if (forgotError) setForgotError(undefined);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={!!forgotError}
                  aria-describedby={forgotError ? "forgot-email-error" : undefined}
                  className={cn(forgotError && "border-destructive focus-visible:ring-destructive")}
                />
                {forgotError && (
                  <p id="forgot-email-error" className={typography("muted", "text-destructive")}>
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
