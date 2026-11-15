import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Banknote, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography";

type TxnType = "sale" | "purchase";

const OPTIONS: {
  type: TxnType;
  title: string;
  description: string;
  icon: typeof Banknote;
  surface: string;
  iconBox: string;
  route: string;
}[] = [
  {
    type: "sale",
    title: "বিক্রি",
    description: "কাস্টমারের কাছে নগদ বা বাকি বিক্রি রেকর্ড করুন।",
    icon: Banknote,
    surface: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5",
    iconBox: "bg-white text-emerald-600 dark:bg-white/10 dark:text-emerald-300",
    route: "/new-sale",
  },
  {
    type: "purchase",
    title: "ক্রয়",
    description: "পাইকারের কাছ থেকে খরচ বা স্টক ক্রয় রেকর্ড করুন।",
    icon: PackagePlus,
    surface: "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/15 dark:to-rose-500/5",
    iconBox: "bg-white text-rose-600 dark:bg-white/10 dark:text-rose-300",
    route: "/expenses?action=new",
  },
];

export default function NewTransactionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <div className="space-y-6 p-1">
          <div>
            <p className={typography("h4", "m-0")}>লেনদেনের ধরন নির্বাচন করুন</p>
            <p className={typography("body-muted", "mt-1")}>
              ফর্ম খুলতে একটি ধরনে চাপ দিন।
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(opt.route);
                  }}
                  className={cn(
                    "group relative flex items-center gap-4 overflow-hidden rounded-2xl border-0 p-5 text-left transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                    opt.surface,
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      opt.iconBox,
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className={typography("body-strong", "m-0 text-foreground")}>
                      {opt.title}
                    </p>
                    <p className={typography("body-muted", "mt-1")}>
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
