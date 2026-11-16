import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { NAV } from "@/lib/copy";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; emoji: string; end?: boolean };

const leftItems: NavItem[] = [
  { title: NAV.dashboard, url: "/", emoji: "🏠", end: true },
  { title: NAV.stocks, url: "/stocks", emoji: "📦" },
];

const rightItems: NavItem[] = [
  { title: NAV.accounting, url: "/accounting", emoji: "📊" },
  { title: NAV.customers, url: "/customers", emoji: "👥" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSale = location.pathname.startsWith("/new-sale");

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
            "group relative flex w-full flex-col items-center justify-center gap-[7px] py-1.5 transition-all duration-200 active:scale-95",
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-700/40 px-2 pt-1.5 backdrop-blur-2xl md:hidden"
      style={{
        background: "linear-gradient(180deg, rgba(6, 44, 30, 0.82) 0%, rgba(2, 20, 13, 0.88) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
      }}
    >
      <div className="mx-auto max-w-md">
        <ul className="grid grid-cols-5 items-end">
          {leftItems.map(renderItem)}

          {/* Center Elevated Sale Button */}
          <li className="flex flex-col items-center justify-center pb-1">
            <button
              type="button"
              onClick={() => navigate("/new-sale")}
              aria-label="বিক্রয়"
              className={cn(
                "shimmer-overlay group relative -mt-7 flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95",
                isSale
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-md ring-2 ring-emerald-300/40"
                  : "bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={cn(
                  "relative z-10 h-7 w-7 fill-white select-none transition-all duration-200",
                  isSale ? "scale-110" : "group-hover:scale-105",
                )}
              >
                <path d="M12.32 20.75Q9.82 20.75 8.4 19.63Q6.99 18.51 6.99 16.17V8.05H9.99V16.14Q9.99 17.3 10.61 17.82Q11.23 18.33 12.33 18.33Q13.08 18.33 13.62 18.06Q14.16 17.79 14.53 17.36Q14.74 17.12 14.88 16.84Q15.03 16.57 15.1 16.29Q15.18 16.01 15.18 15.75Q15.18 15.18 14.8 14.88Q14.42 14.59 13.55 14.59Q13.12 14.59 12.68 14.62Q12.24 14.65 11.78 14.69L11.96 12.37Q12.45 12.34 12.89 12.32Q13.34 12.29 13.86 12.29Q15.97 12.29 17.03 13.11Q18.09 13.93 18.09 15.55Q18.09 16.01 17.99 16.51Q17.89 17.02 17.7 17.51Q17.51 18.01 17.18 18.46Q16.49 19.5 15.26 20.12Q14.03 20.75 12.32 20.75ZM5.2 10.33 5.04 8.02H18.9L19.07 10.33ZM6.98 8.25V6.91Q6.98 6.31 6.7 5.98Q6.42 5.64 5.8 5.64H5.09L4.93 3.25H5.79Q7.85 3.25 8.92 4.12Q9.99 4.99 9.99 6.91V8.25Z" />
              </svg>
              <span className="shimmer-streak" aria-hidden="true" />
            </button>
            <span
              className={cn(
                "mt-[7px] text-[11px] leading-none tracking-tight transition-colors duration-200",
                isSale ? "font-bold text-white" : "font-medium text-emerald-100/70",
              )}
            >
              বিক্রয়
            </span>
          </li>

          {rightItems.map(renderItem)}
        </ul>
      </div>
    </nav>
  );
}

