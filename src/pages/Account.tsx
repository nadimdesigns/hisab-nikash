import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { typography } from "@/lib/typography";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useShop } from "@/store/shop";
import { toast } from "@/hooks/use-toast";

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
        <Card className="home-hero-appear max-w-xl rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:border-emerald-500/25 dark:from-emerald-500/15 dark:to-emerald-500/5">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-emerald-700 text-white font-bold text-lg">
                হি
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>হিসাব নিকাশ</CardTitle>
              <CardDescription>অফলাইন ডিজিটাল খাতা (Android Native)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className={typography("body-muted")}>ডাটা স্টোরেজ মোড</p>
              <p className={typography("body-strong", "text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5")}>
                <span>💾</span> ডিভাইস লোকাল স্টোরেজ (সম্পূর্ণ অফলাইন)
              </p>
              <p className="text-xs text-muted-foreground pt-0.5">
                কোনো ক্লাউড বা ইন্টারনেট কানেকশন প্রয়োজন নেই। আপনার যোগ করা সকল পণ্য, বিক্রি ও বাকি হিসাব সরাসরি এই মোবাইলের মেমরিতে সেভ হচ্ছে।
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="rounded-xl bg-white/70 dark:bg-white/5 p-2.5 border border-emerald-200/60 dark:border-white/10">
                <span className="text-xs text-muted-foreground block">মোট পণ্য</span>
                <span className="text-base font-bold text-foreground">{products.length}</span>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-white/5 p-2.5 border border-emerald-200/60 dark:border-white/10">
                <span className="text-xs text-muted-foreground block">মোট বিক্রি</span>
                <span className="text-base font-bold text-foreground">{sales.length}</span>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-white/5 p-2.5 border border-emerald-200/60 dark:border-white/10">
                <span className="text-xs text-muted-foreground block">মোট ক্রয়</span>
                <span className="text-base font-bold text-foreground">{purchases.length}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
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

            <div className="pt-3 border-t border-emerald-200/60 dark:border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetData}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
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
