import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
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
    title: "Sale",
    description: "Record a cash or due sale to a customer.",
    icon: Banknote,
    surface: "bg-emerald-50 dark:bg-emerald-950/40",
    gradient: "from-emerald-400 to-green-600",
    ring: "ring-emerald-200/60 dark:ring-emerald-500/20",
    route: "/new-sale",
  },
  {
    type: "purchase",
    title: "Purchase",
    description: "Record an expense or stock purchase from a supplier.",
    icon: PackagePlus,
    surface: "bg-rose-50 dark:bg-rose-950/40",
    gradient: "from-rose-400 to-red-500",
    ring: "ring-rose-200/60 dark:ring-rose-500/20",
    route: "/purchases",
  },
];

export default function NewTransaction() {
  const navigate = useNavigate();

  return (
    <AppLayout title="New Transaction">
      <Card className="shadow-soft">
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div>
            <p className={typography("h4", "m-0")}>Choose transaction type</p>
            <p className={typography("body-muted", "mt-1")}>
              Tap a type to open its form.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => navigate(opt.route)}
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
        </CardContent>
      </Card>
    </AppLayout>
  );
}
