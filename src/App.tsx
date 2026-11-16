import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProductQuickSearch } from "./components/ProductQuickSearch";
import { ScrollToTop } from "./components/ScrollToTop";

const Index = lazy(() => import("./pages/Index.tsx"));
const Inventory = lazy(() => import("./pages/Inventory.tsx"));
const NewSale = lazy(() => import("./pages/NewSale.tsx"));
const Customers = lazy(() => import("./pages/Customers.tsx"));
const CustomerDetails = lazy(() => import("./pages/CustomerDetails.tsx"));
const Accounting = lazy(() => import("./pages/Accounting.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

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
          <ProductQuickSearch />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Fully offline: Directly open homepage, redirect login to / */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/" element={<Index />} />
              <Route path="/stocks" element={<Inventory />} />
              <Route path="/new-sale" element={<NewSale />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetails />} />
              <Route path="/accounting" element={<Accounting />} />
              <Route path="/account" element={<Account />} />
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
