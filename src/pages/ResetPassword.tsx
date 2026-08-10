import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { BrandLockup } from "@/components/BrandLogo";

const passwordSchema = z
  .string()
  .min(6, { message: "Password must be at least 6 characters" })
  .max(128, { message: "Password must be less than 128 characters" });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);

  // Wait for Supabase to detect the recovery session in the URL hash.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast({ title: "Password updated", description: "You can now log in with your new password." });
    navigate("/", { replace: true });
  };

  return (
    <main className="h-[100svh] w-full bg-background flex items-center justify-center p-4 overflow-hidden">
      <Card className="w-full max-w-sm shadow-soft">
        <CardHeader className="items-center text-center space-y-px">
          <BrandLockup className="mb-3" iconClassName="h-11 w-11" />
          <CardTitle>নতুন পাসওয়ার্ড দিন</CardTitle>
          <CardDescription>
            {ready ? "আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন।" : "রিসেট লিংক যাচাই করা হচ্ছে…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-password" className={typography("body-strong")}>New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn("pr-10", error && "border-destructive focus-visible:ring-destructive")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className={typography("body-strong")}>Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={cn(error && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            {error && (
              <p role="alert" className={typography("muted", "text-destructive text-center")}>
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting || !ready}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ResetPassword;
