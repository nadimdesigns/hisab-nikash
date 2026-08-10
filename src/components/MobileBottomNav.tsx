import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, BarChart3, LineChart, Plus, Menu, Truck, Calculator, Banknote, Clock, Wallet, PackagePlus, UserPlus, BookUser, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type QuickAction = {
  title: string;
  icon: typeof Banknote;
  url: string;
  // Soft pastel surface + bold gradient blob behind the icon for a 3D look.
  surface: string;
  gradient: string;
  iconColor: string;
  ring: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Cash Received",
    icon: Wallet,
    url: "/sales?action=receive-payment",
    surface: "bg-emerald-50 dark:bg-emerald-950/40",
    gradient: "from-emerald-400 to-green-600",
    iconColor: "text-white",
    ring: "ring-emerald-200/60 dark:ring-emerald-500/20",
  },
  {
    title: "Cash Sale",
    icon: Banknote,
    url: "/new-sale?mode=cash",
    surface: "bg-emerald-50 dark:bg-emerald-950/40",
    gradient: "from-emerald-400 to-green-600",
    iconColor: "text-white",
    ring: "ring-emerald-200/60 dark:ring-emerald-500/20",
  },
  {
    title: "New Purchase",
    icon: PackagePlus,
    url: "/purchases?action=new",
    surface: "bg-rose-50 dark:bg-rose-950/40",
    gradient: "from-rose-400 to-red-500",
    iconColor: "text-white",
    ring: "ring-rose-200/60 dark:ring-rose-500/20",
  },
  {
    title: "Due Sale",
    icon: Clock,
    url: "/due-sale",
    surface: "bg-rose-50 dark:bg-rose-950/40",
    gradient: "from-rose-400 to-red-500",
    iconColor: "text-white",
    ring: "ring-rose-200/60 dark:ring-rose-500/20",
  },
  {
    title: "New Customer",
    icon: UserPlus,
    url: "/new-customer",
    surface: "bg-sky-50 dark:bg-sky-950/40",
    gradient: "from-sky-400 to-blue-600",
    iconColor: "text-white",
    ring: "ring-sky-200/60 dark:ring-sky-500/20",
  },
  {
    title: "Add Medicine",
    icon: Package,
    url: "/add-medicine",
    surface: "bg-violet-50 dark:bg-violet-950/40",
    gradient: "from-violet-400 to-purple-600",
    iconColor: "text-white",
    ring: "ring-violet-200/60 dark:ring-violet-500/20",
  },
];

const leftItems = [
  { title: "Home", url: "/", icon: LayoutDashboard, end: true },
  { title: "Stocks", url: "/stocks", icon: Package },
];

const rightItems = [
  { title: "Accounting", url: "/accounting", icon: BarChart3 },
];

const reportItems: QuickAction[] = [
  {
    title: "Expenses",
    icon: Truck,
    url: "/expenses",
    surface: "bg-rose-50 dark:bg-rose-950/40",
    gradient: "from-rose-400 to-red-500",
    iconColor: "text-white",
    ring: "ring-rose-200/60 dark:ring-rose-500/20",
  },
  {
    title: "Accounting",
    icon: Calculator,
    url: "/accounting",
    surface: "bg-sky-50 dark:bg-sky-950/40",
    gradient: "from-sky-400 to-indigo-500",
    iconColor: "text-white",
    ring: "ring-sky-200/60 dark:ring-sky-500/20",
  },
  {
    title: "Analytics",
    icon: LineChart,
    url: "/analytics",
    surface: "bg-violet-50 dark:bg-violet-950/40",
    gradient: "from-violet-400 to-purple-600",
    iconColor: "text-white",
    ring: "ring-violet-200/60 dark:ring-violet-500/20",
  },
  {
    title: "Tally Khata",
    icon: BookUser,
    url: "/tally-khata",
    surface: "bg-teal-50 dark:bg-teal-950/40",
    gradient: "from-teal-400 to-cyan-600",
    iconColor: "text-white",
    ring: "ring-teal-200/60 dark:ring-teal-500/20",
  },
  {
    title: "Customers",
    icon: Users,
    url: "/customers",
    surface: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    gradient: "from-fuchsia-400 to-pink-600",
    iconColor: "text-white",
    ring: "ring-fuchsia-200/60 dark:ring-fuchsia-500/20",
  },
];

// Fixed dark palette — does NOT change with app theme.
const NAV_BG = "hsl(222 47% 11%)";
const NAV_BORDER = "hsl(217 33% 18%)";
const NAV_FG = "hsl(210 40% 90%)";
const NAV_FG_DIM = "hsl(210 40% 90% / 0.6)";
const NAV_ACTIVE_FG = "hsl(174 72% 46%)";

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reportsOpen, setReportsOpen] = useState(false);
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
      }}
    >
      <ul className="grid grid-cols-5 items-end">
        {leftItems.map(renderItem)}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            aria-label="Quick actions"
            className="shimmer-overlay relative -mt-[85px] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-lg ring-4 transition-transform active:scale-95"
            style={{ ["--tw-ring-color" as string]: NAV_BG }}
          >
            <Plus className="relative z-10 h-7 w-7" strokeWidth={2} />
            <span className="shimmer-streak" aria-hidden="true" />
          </button>
        </li>

        {rightItems.map(renderItem)}

        <li>
          <Sheet open={reportsOpen} onOpenChange={setReportsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                  typography("small"),
                )}
                style={{ color: NAV_FG_DIM }}
              >
                <div className="flex h-9 w-12 items-center justify-center">
                  <Menu className="h-5 w-5" />
                </div>
                <span>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[92%] sm:max-w-sm">
              <SheetHeader>
                <SheetTitle className={typography("h3")}>More</SheetTitle>
              </SheetHeader>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {reportItems.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.title}
                      type="button"
                      onClick={() => {
                        setReportsOpen(false);
                        navigate(action.url);
                      }}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl p-5 ring-1 transition-all active:scale-[0.97] animate-fade-in",
                        action.surface,
                        action.ring,
                      )}
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <span
                        className={cn(
                          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
                          action.gradient,
                        )}
                      />
                      <span
                        className={cn(
                          "relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg shadow-black/10 transition-transform group-active:scale-95",
                          action.gradient,
                        )}
                      >
                        <span className="absolute inset-x-2 top-1 h-3 rounded-full bg-white/30 blur-[2px]" />
                        <Icon className={cn("relative h-7 w-7 drop-shadow-sm", action.iconColor)} strokeWidth={2} />
                      </span>
                      <span className={cn(typography("body-strong"), "text-center text-foreground")}>
                        {action.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>

      {/* Quick action bottom sheet */}
      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t-0 bg-background p-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="px-6 pt-4">
            <SheetTitle className={typography("h3")}>Quick Actions</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 px-5 pb-2 pt-5">
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
                    "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl p-5 ring-1 transition-all active:scale-[0.97]",
                    action.surface,
                    action.ring,
                    "animate-fade-in",
                  )}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Decorative gradient blob */}
                  <span
                    className={cn(
                      "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
                      action.gradient,
                    )}
                  />
                  {/* 3D-style icon tile */}
                  <span
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg shadow-black/10 transition-transform group-active:scale-95",
                      action.gradient,
                    )}
                  >
                    <span className="absolute inset-x-2 top-1 h-3 rounded-full bg-white/30 blur-[2px]" />
                    <Icon className={cn("relative h-7 w-7 drop-shadow-sm", action.iconColor)} strokeWidth={2} />
                  </span>
                  <span className={cn(typography("body-strong"), "text-center text-foreground")}>
                    {action.title}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
