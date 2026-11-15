import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { typography } from "@/lib/typography";
import { signOut, useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import UserManagement from "@/components/account/UserManagement";

const Account = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    toast({ title: "সাইন আউট হয়েছে", description: "আপনি সাইন আউট হয়েছেন।" });
    navigate("/login", { replace: true });
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    (user?.email?.split("@")[0] ?? "") ||
    "ব্যবহারকারী";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <AppLayout title="অ্যাকাউন্ট">
      <div className="space-y-6">
        <Card className="home-hero-appear max-w-xl rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-14 w-14">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{displayName}</CardTitle>
              <CardDescription>হিসাব নিকাশ অ্যাকাউন্ট</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className={typography("body-muted")}>মোবাইল নম্বর</p>
              <p className={typography("body-strong", "tabular-nums")}>
                📱 {user?.email?.split("@")[0] ?? "—"}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p className={typography("body-muted")}>অ্যাপ থিম</p>
              <div
                role="tablist"
                aria-label="অ্যাপ থিম"
                className="flex items-center gap-1.5 rounded-full bg-emerald-100/60 p-1 dark:bg-emerald-500/15"
              >
                {[
                  { value: "light", label: "লাইট", icon: "☀️" },
                  { value: "dark", label: "ডার্ক", icon: "🌙" },
                  { value: "system", label: "সিস্টেম", icon: "💻" },
                ].map((opt) => {
                  const active = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-colors sm:text-sm",
                        active
                          ? "bg-emerald-900 text-white"
                          : "text-foreground/75 hover:text-foreground",
                      )}
                    >
                      <span aria-hidden="true">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Button variant="destructive" onClick={handleLogout}>
                লগ আউট
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && <UserManagement currentUserId={user?.id} />}
      </div>
    </AppLayout>
  );
};

export default Account;
