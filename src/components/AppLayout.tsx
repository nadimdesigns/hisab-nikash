import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { ThemeToggle } from "./ThemeToggle";

import { Search } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useHeaderSlot } from "./HeaderSlot";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { openMedicineQuickSearch } from "./MedicineQuickSearch";
import { typography } from "@/lib/typography";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children, title }: { children: ReactNode; title: string }) {
  const { content: headerSlot } = useHeaderSlot();
  const { user } = useAuth();
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
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-4 pt-[5px] md:pt-0">
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
                <BrandLogo className="h-8 w-8" />
              </div>
            </div>
            <h1 className={typography("h3", "shrink-0 text-sidebar-foreground")}>{title}</h1>
            {headerSlot && (
              <div className="hidden flex-1 justify-center md:flex">
                <div className="w-full max-w-md">{headerSlot}</div>
              </div>
            )}
            <div className={headerSlot ? "ml-auto flex shrink-0 items-center gap-1 md:ml-0" : "ml-auto flex items-center gap-1"}>
              <Button
                variant="ghost"
                size="icon"
                onClick={openMedicineQuickSearch}
                aria-label="Search medicines"
                title="Search medicines (⌘K)"
              >
                <Search className="h-4 w-4" />
              </Button>
              <ThemeToggle />
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
