import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Truck, BarChart3, LineChart, Palette, Settings as SettingsIcon, Users } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Stocks", url: "/stocks", icon: Package },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Purchases", url: "/purchases", icon: Truck },
  { title: "Accounting", url: "/accounting", icon: BarChart3 },
  { title: "Analytics", url: "/analytics", icon: LineChart },
  { title: "Style Guide", url: "/style-guide", icon: Palette },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-elevated">
            <BrandLogo className="h-9 w-9" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className={typography("body-strong", "text-sidebar-foreground")}>PharmaSee</span>
              <span className={typography("body-muted", "text-sidebar-foreground/60")}>Pharmacy Manager</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
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
