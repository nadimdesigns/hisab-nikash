import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import RequireAuth from "./components/RequireAuth";
import { ScrollToTop } from "./components/ScrollToTop";
import { useAppUpdater } from "./lib/appUpdate";
import { useCloudSync } from "./lib/cloudSync";

const Index = lazy(() => import("./pages/Index.tsx"));
const Inventory = lazy(() => import("./pages/Inventory.tsx"));
const NewSale = lazy(() => import("./pages/NewSale.tsx"));
const Customers = lazy(() => import("./pages/Customers.tsx"));
const CustomerDetails = lazy(() => import("./pages/CustomerDetails.tsx"));
const Accounting = lazy(() => import("./pages/Accounting.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
// The style guide is a web-only reference page; the Android bundle leaves it out.
const StyleGuide = __IS_APK__ ? null : lazy(() => import("./pages/StyleGuide.tsx"));
// Quick-search pulls in fuse.js, date-fns and the whole shop store, so it is
// loaded off the critical path and never on the login screen.
const ProductQuickSearch = lazy(() =>
  import("./components/ProductQuickSearch").then((m) => ({ default: m.ProductQuickSearch })),
);

/** Mounts the "reload when a newer build is deployed" watcher inside the router. */
const AppUpdater = () => {
  useAppUpdater();
  return null;
};

/** Keeps this device's shop data and the cloud copy in step (same phone number, any device). */
const CloudSync = () => {
  useCloudSync();
  return null;
};

const GlobalQuickSearch = () => {
  const { pathname } = useLocation();
  if (pathname === "/login") return null;
  return (
    <Suspense fallback={null}>
      <ProductQuickSearch />
    </Suspense>
  );
};

const PageFallback = () => (
  <div className="flex h-[100svh] items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AppUpdater />
          <CloudSync />
          <GlobalQuickSearch />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/privacy" element={<Privacy />} />
              {StyleGuide && <Route path="/style-guide" element={<StyleGuide />} />}
              <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
              <Route path="/stocks" element={<RequireAuth><Inventory /></RequireAuth>} />
              <Route path="/new-sale" element={<RequireAuth><NewSale /></RequireAuth>} />
              <Route path="/customers" element={<RequireAuth><Customers /></RequireAuth>} />
              <Route path="/customers/:id" element={<RequireAuth><CustomerDetails /></RequireAuth>} />
              <Route path="/accounting" element={<RequireAuth><Accounting /></RequireAuth>} />
              <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
