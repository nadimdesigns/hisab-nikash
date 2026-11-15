import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingCart, Package, BarChart3, Users, type LucideIcon } from "lucide-react";
import { NAV } from "@/lib/copy";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: LucideIcon; end?: boolean };

const leftItems: NavItem[] = [
  { title: "বিক্রয়", url: "/new-sale", icon: ShoppingCart },
  { title: NAV.stocks, url: "/stocks", icon: Package },
];

const rightItems: NavItem[] = [
  { title: NAV.accounting, url: "/accounting", icon: BarChart3 },
  { title: NAV.customers, url: "/customers", icon: Users },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  const renderItem = (item: NavItem) => {
    const active = item.end
      ? location.pathname === item.url
      : location.pathname.startsWith(item.url);
    return (
      <li key={item.title} className="flex justify-center">
        <NavLink
          to={item.url}
          end={item.end}
          className={cn(
            "group relative flex w-full flex-col items-center justify-center gap-1 py-2 transition-all duration-200 active:scale-95",
          )}
        >
          {/* Top active glowing bar */}
          <span
            className={cn(
              "absolute top-0 h-0.5 rounded-full bg-emerald-300 transition-all duration-300",
              active ? "w-5 opacity-100" : "w-0 opacity-0",
            )}
          />

          {/* Icon capsule */}
          <div
            className={cn(
              "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200",
              active
                ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30"
                : "text-emerald-100/60 group-hover:bg-white/5 group-hover:text-emerald-100/90",
            )}
          >
            <item.icon
              className={cn(
                "h-[19px] w-[19px] transition-transform duration-200",
                active ? "scale-110" : "group-hover:scale-105",
              )}
              strokeWidth={2}
            />
          </div>

          <span
            className={cn(
              "text-[11px] leading-none tracking-tight transition-colors duration-200",
              active ? "font-bold text-white" : "font-medium text-emerald-100/65",
            )}
          >
            {item.title}
          </span>
        </NavLink>
      </li>
    );
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-2.5 pt-2 md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <nav
        aria-label="প্রধান নেভিগেশন"
        className="pointer-events-auto relative mx-auto max-w-md rounded-[26px] border border-emerald-400/25 bg-gradient-to-b from-[#073524]/95 to-[#031c12]/98 px-1.5 py-1 backdrop-blur-2xl"
      >
        {/* Subtle top specular highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent"
        />

        <ul className="grid grid-cols-5 items-end">
          {leftItems.map(renderItem)}

          {/* Center Elevated Home Button */}
          <li className="flex flex-col items-center justify-center pb-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label={NAV.dashboard}
              className={cn(
                "shimmer-overlay group relative -mt-7 flex h-13 w-13 items-center justify-center overflow-hidden rounded-full border text-white ring-4 ring-[#052619] transition-all duration-200 hover:-translate-y-0.5 active:scale-95",
                isHome
                  ? "h-[52px] w-[52px] border-emerald-200/50 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
                  : "h-[52px] w-[52px] border-white/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400",
              )}
            >
              <Home
                className={cn(
                  "relative z-10 h-5 w-5 transition-transform duration-200",
                  isHome ? "scale-110" : "group-hover:scale-105",
                )}
                strokeWidth={2}
              />
              <span className="shimmer-streak" aria-hidden="true" />
            </button>
            <span
              className={cn(
                "mt-1 text-[11px] leading-none tracking-tight transition-colors duration-200",
                isHome ? "font-bold text-emerald-300" : "font-medium text-emerald-100/70",
              )}
            >
              {NAV.dashboard}
            </span>
          </li>

          {rightItems.map(renderItem)}
        </ul>
      </nav>
    </div>
  );
}

