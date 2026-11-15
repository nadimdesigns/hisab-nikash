import AppLayout from "@/components/AppLayout";
import NewInvoiceCard from "@/components/NewInvoiceCard";
import { useSearchParams } from "react-router-dom";
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
          className={cn(
            "grid grid-cols-2 gap-2 rounded-full p-1 transition-colors",
            isCredit
              ? "bg-rose-100/70 dark:bg-rose-500/15"
              : "bg-emerald-100/60 dark:bg-emerald-500/15",
          )}
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isCredit}
            onClick={() => setMode("cash")}
            className={cn(
              "flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              !isCredit
                ? "bg-emerald-900 text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <span>নগদ বিক্রি</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isCredit}
            onClick={() => setMode("credit")}
            className={cn(
              "flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              isCredit
                ? "bg-rose-600 text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <span>বাকি বিক্রি</span>
          </button>
        </div>

        <NewInvoiceCard title={isCredit ? "Due Sale" : "Cash Sale"} />
      </div>
    </AppLayout>
  );
}
