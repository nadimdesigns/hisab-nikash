import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, BarChart3, Plus, Banknote, Clock, Wallet, PackagePlus, UserPlus, Users, type LucideIcon } from "lucide-react";
import { ACTION, NAV } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type QuickAction = {
  title: string;
  icon: typeof Banknote;
  url: string;
  surface: string;
  iconBox: string;
};

const quickActions: QuickAction[] = [
  {
    title: ACTION.cashSale,
    icon: Banknote,
    url: "/new-sale?mode=cash",
    surface: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5",
    iconBox: "bg-white text-emerald-600 dark:bg-white/10 dark:text-emerald-300",
  },
  {
    title: ACTION.dueSale,
    icon: Clock,
    url: "/new-sale?mode=credit",
    surface: "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/15 dark:to-rose-500/5",
    iconBox: "bg-white text-rose-600 dark:bg-white/10 dark:text-rose-300",
  },
  {
    title: "টাকা জমা",
    icon: Wallet,
    url: "/accounting?tab=payment",
    surface: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5",
    iconBox: "bg-white text-emerald-600 dark:bg-white/10 dark:text-emerald-300",
  },
  {
    title: ACTION.newPurchase,
    icon: PackagePlus,
    url: "/expenses?tab=purchase",
    surface: "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/15 dark:to-rose-500/5",
    iconBox: "bg-white text-rose-600 dark:bg-white/10 dark:text-rose-300",
  },
  {
    title: ACTION.newCustomer,
    icon: UserPlus,
    url: "/customers?tab=new",
    surface: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5",
    iconBox: "bg-white text-emerald-600 dark:bg-white/10 dark:text-emerald-300",
  },
  {
    title: `${NAV.stocks} ${ACTION.add}`,
    icon: Package,
    url: "/stocks?new=1",
    surface: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/15 dark:to-emerald-500/5",
    iconBox: "bg-white text-emerald-600 dark:bg-white/10 dark:text-emerald-300",
  },
];

type NavItem = { title: string; url: string; icon: LucideIcon; end?: boolean };

const leftItems: NavItem[] = [
  { title: NAV.dashboard, url: "/", icon: LayoutDashboard, end: true },
  { title: NAV.stocks, url: "/stocks", icon: Package },
];

const rightItems: NavItem[] = [
  { title: NAV.accounting, url: "/accounting", icon: BarChart3 },
  { title: NAV.customers, url: "/customers", icon: Users },
];

// Fixed very-dark-green glass palette — does NOT change with app theme.
const NAV_BG = "rgba(3, 28, 18, 0.92)";
const NAV_BORDER = "rgba(52, 211, 153, 0.18)";
const NAV_FG = "hsl(150 30% 92%)";
const NAV_FG_DIM = "hsla(150, 30%, 92%, 0.55)";
const NAV_ACTIVE_FG = "hsl(48 96% 55%)";

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);

  const renderItem = (item: (typeof leftItems)[number]) => {
    const active = item.end
      ? location.pathname === item.url
      : location.pathname.startsWith(item.url);
    return (
      <li key={item.title}>
        <NavLink
          to={item.url}
          end={item.end}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
            typography("small"),
          )}
          style={{ color: active ? NAV_ACTIVE_FG : NAV_FG_DIM }}
        >
          <div className="flex h-9 w-12 items-center justify-center">
            <item.icon className="h-5 w-5" />
          </div>
          <span>{item.title}</span>
        </NavLink>
      </li>
    );
  };

  return (
    <nav
      className="border-t md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
        background: NAV_BG,
        borderTopColor: NAV_BORDER,
        color: NAV_FG,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <ul className="grid grid-cols-5 items-end">
        {leftItems.map(renderItem)}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            aria-label="Quick actions"
            className="shimmer-overlay relative -mt-[85px] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white ring-4 transition-transform active:scale-95"
            style={{ ["--tw-ring-color" as string]: NAV_BG }}
          >
            <Plus className="relative z-10 h-7 w-7" strokeWidth={2} />
            <span className="shimmer-streak" aria-hidden="true" />
          </button>
        </li>

        {rightItems.map(renderItem)}
      </ul>

      {/* Quick action centered dialog */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="rounded-3xl border bg-background p-5 sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className={typography("h3")}>দ্রুত কাজ</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    navigate(action.url);
                  }}
                  className={cn(
                    "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-0 p-5 transition-all active:scale-[0.97]",
                    action.surface,
                    "animate-fade-in",
                  )}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-active:scale-95",
                      action.iconBox,
                    )}
                  >
                    <Icon className="relative h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className={cn(typography("body-strong"), "text-center text-foreground")}>
                    {action.title}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
