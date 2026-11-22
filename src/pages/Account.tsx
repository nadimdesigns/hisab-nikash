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
import { syncNow, useSyncStatus } from "@/lib/cloudSync";
import { isDemoMode } from "@/lib/demoMode";
import { formatDate } from "@/lib/format";
import { readOtaLog } from "@/lib/otaLog";
import { IS_APK } from "@/lib/appTarget";

const Account = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { theme, setTheme } = useTheme();
  const sync = useSyncStatus();
  const syncText =
    sync.state === "syncing"
      ? "সিঙ্ক হচ্ছে…"
      : sync.state === "offline"
        ? "অফলাইন — ইন্টারনেট পেলে সিঙ্ক হবে"
        : sync.state === "error"
          ? "সিঙ্ক হয়নি — একটু পরে আবার চেষ্টা হবে"
          : sync.lastSyncedAt
            ? `সিঙ্ক হয়েছে · ${formatDate(sync.lastSyncedAt, "hh:mm a")}`
            : "সিঙ্ক শুরু হচ্ছে…";

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
        <Card className="home-hero-appear max-w-xl rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5">
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

            {!isDemoMode() && (
              <div className="space-y-1">
                <p className={typography("body-muted")}>ক্লাউড সিঙ্ক</p>
                <p className={typography("body")}>
                  ☁️ {syncText}
                </p>
                <p className={typography("body-muted")}>
                  একই মোবাইল নম্বর দিয়ে অন্য ফোনে লগইন করলে এই দোকানের হিসাব সেখানেও দেখা যাবে।
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sync.state === "syncing"}
                  onClick={() => void syncNow()}
                >
                  এখনই সিঙ্ক করুন
                </Button>
              </div>
            )}

            <div className="space-y-1">
              <p className={typography("body-muted")}>অ্যাপ সংস্করণ</p>
              <p className={typography("body", "tabular-nums")}>
                {IS_APK ? "📱 অ্যান্ড্রয়েড অ্যাপ" : "🌐 ওয়েব"} · {String(__APP_VERSION__).slice(0, 7)}
              </p>
              {IS_APK &&
                readOtaLog()
                  .slice(-4)
                  .map((e) => (
                    <p key={e.at + e.msg} className={typography("body-muted")}>
                      {formatDate(e.at, "hh:mm a")} · {e.msg}
                    </p>
                  ))}
            </div>

            <div className="space-y-2 pt-1">
              <p className={typography("body-muted")}>অ্যাপ থিম</p>
              <div
                role="tablist"
                aria-label="অ্যাপ থিম"
                className="flex items-center gap-1.5 rounded-full bg-brand-100/60 p-1 dark:bg-brand-500/15"
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
                          ? "bg-brand-900 text-white"
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
