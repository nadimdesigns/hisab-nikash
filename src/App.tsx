import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import DesignTokensProvider from "@/components/DesignTokensProvider";
import { HeaderSlotProvider } from "@/components/HeaderSlot";
import Index from "./pages/Index.tsx";
import Inventory from "./pages/Inventory.tsx";
import AddProduct from "./pages/AddProduct.tsx";
import EditProduct from "./pages/EditProduct.tsx";
import NewSale from "./pages/NewSale.tsx";
import NewTransaction from "./pages/NewTransaction.tsx";
import DueSale from "./pages/DueSale.tsx";
import NewCustomer from "./pages/NewCustomer.tsx";
import Customers from "./pages/Customers.tsx";
import CustomerDetails from "./pages/CustomerDetails.tsx";
import Purchases from "./pages/Purchases.tsx";
import Expenses from "./pages/Expenses.tsx";
import Accounting from "./pages/Accounting.tsx";
import Analytics from "./pages/Analytics.tsx";
import StyleGuide from "./pages/StyleGuide.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import Account from "./pages/Account.tsx";
import Login from "./pages/Login.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import RequireAuth from "./components/RequireAuth";
import { ProductQuickSearch } from "./components/ProductQuickSearch";
import { ScrollToTop } from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <DesignTokensProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <HeaderSlotProvider>
            <ScrollToTop />
            <ProductQuickSearch />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
              <Route path="/stocks" element={<RequireAuth><Inventory /></RequireAuth>} />
              <Route path="/add-product" element={<RequireAuth><AddProduct /></RequireAuth>} />
              <Route path="/edit-product/:id" element={<RequireAuth><EditProduct /></RequireAuth>} />
              <Route path="/inventory" element={<Navigate to="/stocks" replace />} />
              <Route path="/new-sale" element={<RequireAuth><NewSale /></RequireAuth>} />
              <Route path="/new-transaction" element={<RequireAuth><NewTransaction /></RequireAuth>} />
              <Route path="/due-sale" element={<RequireAuth><DueSale /></RequireAuth>} />
              <Route path="/new-customer" element={<RequireAuth><NewCustomer /></RequireAuth>} />
              <Route path="/customers" element={<RequireAuth><Customers /></RequireAuth>} />
              <Route path="/customers/:id" element={<RequireAuth><CustomerDetails /></RequireAuth>} />
              <Route path="/purchases" element={<RequireAuth><Purchases /></RequireAuth>} />
              <Route path="/expenses" element={<RequireAuth><Expenses /></RequireAuth>} />
              <Route path="/accounting" element={<RequireAuth><Accounting /></RequireAuth>} />
              <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
              <Route path="/style-guide" element={<RequireAuth><StyleGuide /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HeaderSlotProvider>
        </BrowserRouter>
      </TooltipProvider>
      </DesignTokensProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
