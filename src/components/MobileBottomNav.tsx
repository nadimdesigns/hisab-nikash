import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { NAV } from "@/lib/copy";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; emoji: string; end?: boolean };

const leftItems: NavItem[] = [
  { title: "বিক্রয়", url: "/new-sale", emoji: "🛒" },
  { title: NAV.stocks, url: "/stocks", emoji: "📦" },
];

const rightItems: NavItem[] = [
  { title: NAV.accounting, url: "/accounting", emoji: "📊" },
  { title: NAV.customers, url: "/customers", emoji: "👥" },
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
          {/* Icon capsule */}
          <div
            className={cn(
              "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200",
              active
                ? "bg-emerald-400/20 ring-1 ring-emerald-300/30"
                : "group-hover:bg-white/5",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "text-[18px] leading-none select-none transition-transform duration-200",
                active ? "scale-110" : "opacity-80 group-hover:scale-105 group-hover:opacity-100",
              )}
            >
              {item.emoji}
            </span>
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
    <nav
      aria-label="প্রধান নেভিগেশন"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-800/60 px-2 pt-1.5 backdrop-blur-2xl md:hidden"
      style={{
        background: "linear-gradient(180deg, rgba(6, 44, 30, 0.98) 0%, rgba(2, 20, 13, 0.99) 100%)",
        paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
      }}
    >
      <div className="mx-auto max-w-md">
        <ul className="grid grid-cols-5 items-end">
          {leftItems.map(renderItem)}

          {/* Center Elevated Home Button */}
          <li className="flex flex-col items-center justify-center pb-1">
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label={NAV.dashboard}
              className={cn(
                "shimmer-overlay group relative -mt-7 flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95",
                isHome
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 text-xl leading-none select-none transition-transform duration-200",
                  isHome ? "scale-110" : "group-hover:scale-105",
                )}
              >
                🏠
              </span>
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
      </div>
    </nav>
  );
}

