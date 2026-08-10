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
import { Eye, EyeOff, Copy } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DEMO_USERNAME, DEMO_PASSWORD, enableDemoMode } from "@/lib/demoMode";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
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
    const result = z.string().trim().email({ message: "Enter a valid email address" }).safeParse(forgotEmail);
    if (!result.success) {
      setForgotError(result.error.issues[0]?.message ?? "Invalid email");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Demo account short-circuit (purely client-side, no backend call).
    if (mode === "login" && email.trim().toLowerCase() === DEMO_USERNAME && password === DEMO_PASSWORD) {
      enableDemoMode();
      window.dispatchEvent(new Event("pharmasee-demo-changed"));
      toast({ title: "Demo mode", description: "Logged in as demo user." });
      // Reload so persisted stores re-init under the demo namespace.
      window.location.replace(from);
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
          toast({ title: "Welcome back", description: "Logged in successfully." });
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
          toast({ title: "Account created", description: "You're now signed in." });
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
          <div className="mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-elevated">
            <BrandLogo className="h-14 w-14" />
          </div>
          <CardTitle>PharmaSee</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Please Login to access your dashboard."
              : "Create an account to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className={typography("body-strong")}>Email</Label>
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
              <Label htmlFor="password" className={typography("body-strong")}>Password</Label>
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
                  Forgot password?
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
                : mode === "login" ? "Log in" : "Sign up"}
            </Button>


            <p className={typography("muted", "text-center")}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "login" ? "signup" : "login"));
                  setErrors({});
                }}
                className="font-medium text-primary hover:underline"
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>

            {mode === "login" && (
              <div className="space-y-2">
                <p className={typography("muted", "text-center")}>Try the demo account</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Username", value: DEMO_USERNAME, field: "email" as const },
                    { label: "Password", value: DEMO_PASSWORD, field: "password" as const },
                  ].map(({ label, value, field }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (field === "email") setEmail(value);
                        else setPassword(value);
                        setErrors({});
                        navigator.clipboard?.writeText(value).catch(() => {});
                      }}
                      className="group flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Copy demo ${label.toLowerCase()} and fill ${label.toLowerCase()} field`}
                    >
                      <div className="min-w-0">
                        <p className={typography("muted", "text-[11px] leading-none")}>{label}</p>
                        <p className={typography("body-strong", "truncate text-sm")}>{value}</p>
                      </div>
                      <Copy className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={(open) => (open ? setForgotOpen(true) : closeForgot())}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
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
                <Label htmlFor="forgot-email">Email</Label>
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
