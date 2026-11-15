# Orphan & Unused Files Archive (`orphan` branch)

এই `orphan` ব্রাঞ্চটিতে **হিসাব নিকাশ (Hisab Nikash)** প্রজেক্টের সমস্ত অব্যবহৃত (unused), অরফান (orphan) পেজ, কম্পোনেন্ট, ইউআই এলিমেন্ট, অ্যাসেট এবং ডেড কোড সংরক্ষণ করা হয়েছে, যেগুলো `main` ব্রাঞ্চ থেকে ক্লিনআপ করা হয়েছে।

---

## ১. Misplaced Dialog Pages (`src/pages/` থেকে সরানো হয়েছে)
- `src/pages/NewCustomer.tsx` (`main` ব্রাঞ্চে `src/components/sales/NewCustomerDialog.tsx`-এ স্থানান্তরিত)
- `src/pages/NewTransaction.tsx` (`main` ব্রাঞ্চে `src/components/accounting/NewTransactionDialog.tsx`-এ স্থানান্তরিত)

## ২. Orphan Custom Components & Utilities (`main` ব্রাঞ্চ থেকে মুছে ফেলা হয়েছে)
- `src/components/inventory/SalesPanel.tsx`
- `src/components/sales/DailySalesTable.tsx`
- `src/components/sales/PaymentStatusBadge.tsx`
- `src/components/NavLink.tsx`
- `src/components/SmoothScrollToggle.tsx`
- `src/components/TypographyHoverInspector.tsx`
- `src/components/HeaderSlot.tsx`
- `src/components/DesignTokensProvider.tsx`
- `src/lib/designTokens.ts`
- `src/lib/sku.ts`
- `src/integrations/lovable/index.ts`
- `src/App.css`
- `src/test/example.test.ts`

## ৩. Unused Assets (`src/assets/`)
- `src/assets/logo.png`
- `src/assets/pharmasee-logo.png.asset.json`
- `src/assets/stat-inventory.png`
- `src/assets/stat-profit.png`
- `src/assets/stat-revenue.png`
- `src/assets/stat-warning.png`

## ৪. Unused Shadcn UI Primitives (`src/components/ui/` — ২৬টি ফাইল)
- `src/components/ui/accordion.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/text.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/use-toast.ts`

## ৫. Dead / Duplicate Code Blocks Preserved Here
- `src/components/sales/CustomersPanel.tsx` — Unreachable Customer Details Sheet (`selectedCustomer` drawer), duplicate `recordCustomerPayment`, and unused filter state variables.
- `src/pages/CustomerDetails.tsx` — Duplicate `CustomerProfile`, `PROFILES_KEY`, `loadProfiles`, and `saveProfiles` definitions.
- `src/components/BrandLogo.tsx` — Unused `BrandLockup` component.
- `src/components/NewInvoiceCard.tsx` — Unused `saleType` state and unused imports (`PaymentStatusBadge`, `Card`, `Label`, `Receipt`).
