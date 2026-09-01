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
  gradient: string;
  ring: string;
  route: string;
}[] = [
  {
    type: "sale",
    title: "বিক্রি",
    description: "কাস্টমারের কাছে নগদ বা বাকি বিক্রি রেকর্ড করুন।",
    icon: Banknote,
    surface: "bg-emerald-50 dark:bg-emerald-950/40",
    gradient: "from-emerald-400 to-green-600",
    ring: "ring-emerald-200/60 dark:ring-emerald-500/20",
    route: "/new-sale",
  },
  {
    type: "purchase",
    title: "ক্রয়",
    description: "পাইকারের কাছ থেকে খরচ বা স্টক ক্রয় রেকর্ড করুন।",
    icon: PackagePlus,
    surface: "bg-rose-50 dark:bg-rose-950/40",
    gradient: "from-rose-400 to-red-500",
    ring: "ring-rose-200/60 dark:ring-rose-500/20",
    route: "/purchases",
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
                    "group relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-left ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 active:scale-[0.98]",
                    opt.surface,
                    opt.ring,
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40",
                      opt.gradient,
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                      opt.gradient,
                    )}
                  >
                    <Icon className="h-7 w-7 drop-shadow-sm" strokeWidth={2} />
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
