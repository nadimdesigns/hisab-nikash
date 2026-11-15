import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, LineChart, Package, BarChart3, Users, type LucideIcon } from "lucide-react";
import { NAV } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography";

type NavItem = { title: string; url: string; icon: LucideIcon; end?: boolean };

const leftItems: NavItem[] = [
  { title: NAV.reports, url: "/reports", icon: LineChart },
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
            onClick={() => navigate("/")}
            aria-label={NAV.dashboard}
            className="shimmer-overlay relative -mt-[85px] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white ring-4 transition-transform active:scale-95"
            style={{ ["--tw-ring-color" as string]: NAV_BG }}
          >
            <Home className="relative z-10 h-6 w-6" strokeWidth={2} />
            <span className="shimmer-streak" aria-hidden="true" />
          </button>
        </li>

        {rightItems.map(renderItem)}
      </ul>
    </nav>
  );
}
