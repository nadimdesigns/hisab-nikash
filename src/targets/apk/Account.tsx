import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { typography } from "@/lib/typography";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useShop } from "@/store/shop";
import { toast } from "@/hooks/use-toast";

/** APK variant of src/pages/Account.tsx: local data summary, theme and reset (no account/logout). */
const Account = () => {
  const { theme, setTheme } = useTheme();
  const { resetAll, products, sales, purchases } = useShop();

  const handleResetData = () => {
    if (window.confirm("আপনি কি নিশ্চিত যে সমস্ত তথ্য রিসেট করতে চান? এটি আপনার ডিভাইসের পণ্য ও হিসাব পূর্বাবস্থায় ফিরিয়ে আনবে।")) {
      resetAll();
      toast({ title: "তথ্য রিসেট সফল", description: "ডিফল্ট তথ্য লোড করা হয়েছে।" });
    }
  };

  return (
    <AppLayout title="সেটিংস ও তথ্য">
      <div className="space-y-6">
        <Card className="home-hero-appear max-w-xl rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 dark:border-brand-500/25 dark:from-brand-500/15 dark:to-brand-500/5">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-brand-700 text-white font-bold text-lg">হি</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>হিসাব নিকাশ</CardTitle>
              <CardDescription>অফলাইন ডিজিটাল খাতা (Android)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className={typography("body-muted")}>ডাটা স্টোরেজ মোড</p>
              <p className={typography("body-strong", "flex items-center gap-1.5 text-brand-700 dark:text-brand-300")}>
                <span>💾</span> ডিভাইস লোকাল স্টোরেজ (সম্পূর্ণ অফলাইন)
              </p>
              <p className="pt-0.5 text-xs text-muted-foreground">
                কোনো ক্লাউড বা ইন্টারনেট কানেকশন প্রয়োজন নেই। আপনার যোগ করা সকল পণ্য, বিক্রি ও বাকি হিসাব সরাসরি এই মোবাইলের মেমরিতে সেভ হচ্ছে।
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              {[
                ["মোট পণ্য", products.length],
                ["মোট বিক্রি", sales.length],
                ["মোট ক্রয়", purchases.length],
              ].map(([label, count]) => (
                <div key={label} className="rounded-xl border border-brand-200/60 bg-white/70 p-2.5 dark:border-white/10 dark:bg-white/5">
                  <span className="block text-xs text-muted-foreground">{label}</span>
                  <span className="text-base font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <p className={typography("body-muted")}>অ্যাপ থিম</p>
              <div role="tablist" aria-label="অ্যাপ থিম" className="flex items-center gap-1.5 rounded-full bg-brand-100/60 p-1 dark:bg-brand-500/15">
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
                        active ? "bg-brand-900 text-white" : "text-foreground/75 hover:text-foreground",
                      )}
                    >
                      <span aria-hidden="true">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-brand-200/60 pt-3 dark:border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetData}
                className="border-rose-200 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
              >
                🔄 প্রাথমিক ডেমো তথ্যে রিসেট করুন
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Account;
