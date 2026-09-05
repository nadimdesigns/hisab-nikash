import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Truck, BarChart3, Users, Wallet } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { APP_NAME, APP_TAGLINE, NAV } from "@/lib/copy";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { typography } from "@/lib/typography";
import { cn } from "@/lib/utils";

const items = [
  { title: NAV.dashboard, url: "/", icon: LayoutDashboard, end: true },
  { title: NAV.stocks, url: "/stocks", icon: Package },
  { title: NAV.customers, url: "/customers", icon: Users },
  { title: NAV.purchases, url: "/expenses?tab=purchase", icon: Truck },
  { title: NAV.expenses, url: "/expenses", icon: Wallet },
  { title: NAV.accounting, url: "/accounting", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  // Force the design-system Body token on every nav row so the sidebar
  // primitive's hardcoded `text-sm` can't downgrade us to a different role.
  const navBodyClass = typography("body");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandLogo className="h-9 w-9 shadow-elevated" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className={typography("body-strong", "text-sidebar-foreground")}>{APP_NAME}</span>
              <span className={typography("body-muted", "text-sidebar-foreground/60")}>{APP_TAGLINE}</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{NAV.workspace}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.end
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn("h-12", navBodyClass, "!text-sidebar-foreground", "group-data-[collapsible=icon]:mx-auto")}
                    >
                      <RouterNavLink to={item.url} end={item.end}>
                        <item.icon className="h-5 w-5 text-sidebar-foreground" />
                        {!collapsed && (
                          <span className={cn(navBodyClass, "!text-sidebar-foreground")}>{item.title}</span>
                        )}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
