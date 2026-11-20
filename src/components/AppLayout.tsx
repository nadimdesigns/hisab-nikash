import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { openProductQuickSearch } from "@/lib/quickSearchEvents";
import { typography } from "@/lib/typography";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

export default function AppLayout({ children, title }: { children: ReactNode; title: string }) {
  const { user } = useAuth();
  const [time, setTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initialsSource =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    "U";
  const initials = initialsSource.slice(0, 2).toUpperCase();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="sticky top-0 z-30 relative flex h-14 items-center gap-3 border-b border-emerald-700/40 text-sidebar-foreground px-4 pt-[5px] backdrop-blur-2xl md:pt-0"
            style={{
              background: "linear-gradient(180deg, rgba(6, 44, 30, 0.82) 0%, rgba(2, 20, 13, 0.88) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>
            <h1 className={typography("h3", "whitespace-nowrap shrink-0 text-sidebar-foreground")}>{title}</h1>

            {/* Live Digital Clock centered */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <span
                className="text-[16px] font-normal leading-none tracking-wide text-white tabular-nums select-none"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {format(time, "hh:mm:ss a")}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={openProductQuickSearch}
                aria-label="Search products"
                title="Search products (⌘K)"
              >
                <span aria-hidden="true" className="text-base leading-none select-none">🔍</span>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon" aria-label="Open account">
                    <Link to="/account">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Account</TooltipContent>
              </Tooltip>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-6">
            <div className="mx-auto w-full min-w-0 md:w-[95%] min-[1700px]:w-3/4">{children}</div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
