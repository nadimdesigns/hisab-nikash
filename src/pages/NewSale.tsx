import AppLayout from "@/components/AppLayout";
import NewInvoiceCard from "@/components/NewInvoiceCard";
import { useSearchParams } from "react-router-dom";
import { Banknote, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewSale() {
  const [params, setParams] = useSearchParams();
  const isCredit = params.get("mode") === "credit";

  const setMode = (mode: "cash" | "credit") => {
    const next = new URLSearchParams(params);
    next.set("mode", mode);
    setParams(next, { replace: true });
  };

  return (
    <AppLayout title={isCredit ? "বাকি বিক্রি" : "নগদ বিক্রি"}>
      <div className="space-y-4">
        {/* Pill Tab Switcher: নগদ বিক্রি | বাকি বিক্রি */}
        <div
          role="tablist"
          aria-label="বিক্রির ধরন"
          className="grid grid-cols-2 gap-2 rounded-full bg-emerald-100/60 p-1.5 dark:bg-white/5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isCredit}
            onClick={() => setMode("cash")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              !isCredit
                ? "bg-emerald-900 text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <Banknote className="h-4 w-4 shrink-0" />
            <span>নগদ বিক্রি</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isCredit}
            onClick={() => setMode("credit")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              isCredit
                ? "bg-rose-600 text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span>বাকি বিক্রি</span>
          </button>
        </div>

        <NewInvoiceCard title={isCredit ? "Due Sale" : "Cash Sale"} />
      </div>
    </AppLayout>
  );
}
