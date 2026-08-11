-- Business schema for হিসাব নিকাশ — schema only, not yet wired into the app.
--
-- Every table: owner_id references auth.users(id) directly (single shop
-- per account, no shops/staff table -- matches the app's current
-- single-user-per-login auth model). RLS restricts all four operations to
-- auth.uid() = owner_id: flat comparison, no joins, on every table
-- including line-item children (their owner_id is denormalized from the
-- parent for the same reason).
--
-- Field names and types mirror src/store/shop.ts, src/lib/customerPayments.ts
-- and src/lib/customerPaymentsLog.ts so a future integration is a mechanical
-- mapping, not a redesign. See the README in this directory for what is
-- deliberately NOT included yet (supplier payable ledger, shops table).

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text not null,
  category text not null default '',
  -- Matches UnitCode in src/lib/copy.ts.
  unit text not null default 'piece'
    check (unit in ('kg','gram','litre','ml','piece','dozen','hali','bosta','packet')),
  -- "Lot" in the UI. Empty string, not null, matching how the app writes it today.
  batch text not null default '',
  expiry date,
  -- numeric(12,3): quantities are fractional (2.5 কেজি of rice). Matches
  -- roundQty()'s 3-decimal precision in src/store/shop.ts.
  stock numeric(12,3) not null default 0,
  reorder_level numeric(12,3) not null default 0,
  cost_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  image_url text,
  barcode text,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, sku)
);

create index products_owner_idx on public.products (owner_id);
create index products_owner_expiry_idx on public.products (owner_id, expiry);

alter table public.products enable row level security;

create policy "Owner can select own products" on public.products
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own products" on public.products
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own products" on public.products
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own products" on public.products
  for delete to authenticated using (auth.uid() = owner_id);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Matches how the app already keys customers today (CustomerProfile in
  -- src/lib/customerProfiles.ts has no id; /customers/:id takes a name).
  unique (owner_id, name)
);

create index customers_owner_idx on public.customers (owner_id);

alter table public.customers enable row level security;

create policy "Owner can select own customers" on public.customers
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own customers" on public.customers
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own customers" on public.customers
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own customers" on public.customers
  for delete to authenticated using (auth.uid() = owner_id);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- suppliers -- directory only, no payable/dues ledger yet (see README)
-- ---------------------------------------------------------------------

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create index suppliers_owner_idx on public.suppliers (owner_id);

alter table public.suppliers enable row level security;

create policy "Owner can select own suppliers" on public.suppliers
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own suppliers" on public.suppliers
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own suppliers" on public.suppliers
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own suppliers" on public.suppliers
  for delete to authenticated using (auth.uid() = owner_id);

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- sales / sale_items
-- ---------------------------------------------------------------------

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  -- Denormalized, matches Sale.customer (a plain string, "Walk-in" included)
  -- today. customer_id is optional -- populated once a real profile exists.
  customer_name text not null default 'Walk-in',
  customer_id uuid references public.customers(id) on delete set null,
  total numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  sale_type text not null default 'cash' check (sale_type in ('cash','credit')),
  amount_paid numeric(12,2) not null default 0,
  -- Recording only (Phase 4 feature) -- no payment API integration.
  payment_method text not null default 'cash' check (payment_method in ('cash','bkash','nagad','rocket')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_owner_date_idx on public.sales (owner_id, date desc);
create index sales_owner_customer_idx on public.sales (owner_id, customer_name);

alter table public.sales enable row level security;

create policy "Owner can select own sales" on public.sales
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own sales" on public.sales
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own sales" on public.sales
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own sales" on public.sales
  for delete to authenticated using (auth.uid() = owner_id);

create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  -- Denormalized from the parent sale so RLS stays a flat comparison
  -- instead of an EXISTS subquery through sales.
  owner_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  -- Nullable on purpose: a later-deleted product must not corrupt a
  -- historical sale row. name/unit_price/unit_cost are snapshots, matching
  -- how SaleItem already stores them redundantly today.
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty numeric(12,3) not null,
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_owner_product_idx on public.sale_items (owner_id, product_id);

alter table public.sale_items enable row level security;

create policy "Owner can select own sale_items" on public.sale_items
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own sale_items" on public.sale_items
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own sale_items" on public.sale_items
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own sale_items" on public.sale_items
  for delete to authenticated using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- purchases / purchase_items
-- ---------------------------------------------------------------------

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  supplier_name text not null default '',
  supplier_id uuid references public.suppliers(id) on delete set null,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchases_owner_date_idx on public.purchases (owner_id, date desc);

alter table public.purchases enable row level security;

create policy "Owner can select own purchases" on public.purchases
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own purchases" on public.purchases
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own purchases" on public.purchases
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own purchases" on public.purchases
  for delete to authenticated using (auth.uid() = owner_id);

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty numeric(12,3) not null,
  unit_cost numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index purchase_items_owner_product_idx on public.purchase_items (owner_id, product_id);

alter table public.purchase_items enable row level security;

create policy "Owner can select own purchase_items" on public.purchase_items
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own purchase_items" on public.purchase_items
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own purchase_items" on public.purchase_items
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own purchase_items" on public.purchase_items
  for delete to authenticated using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- dues -- the STANDALONE due-entry bucket (DueEntryLike in
-- src/lib/customerPayments.ts), distinct from a credit sale's amount_paid
-- shortfall on the `sales` table above. Both buckets are consumed
-- together, oldest-first, when a customer makes a payment.
-- ---------------------------------------------------------------------

create table public.dues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null default 'Walk-in',
  customer_id uuid references public.customers(id) on delete set null,
  date timestamptz not null default now(),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dues_owner_customer_idx on public.dues (owner_id, customer_name);

alter table public.dues enable row level security;

create policy "Owner can select own dues" on public.dues
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own dues" on public.dues
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own dues" on public.dues
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own dues" on public.dues
  for delete to authenticated using (auth.uid() = owner_id);

create trigger dues_set_updated_at
before update on public.dues
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- payments -- receipts against outstanding customer balances. Mirrors
-- PaymentEntry in src/lib/customerPaymentsLog.ts.
-- ---------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null default 'Walk-in',
  customer_id uuid references public.customers(id) on delete set null,
  date timestamptz not null default now(),
  amount numeric(12,2) not null check (amount > 0),
  -- Portion of `amount` applied to standalone `dues` rows rather than a
  -- sale's amount_paid -- lets stats avoid double-counting. Matches
  -- allocatedToDues in customerPaymentsLog.ts exactly.
  allocated_to_dues numeric(12,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index payments_owner_customer_idx on public.payments (owner_id, customer_name);

alter table public.payments enable row level security;

create policy "Owner can select own payments" on public.payments
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own payments" on public.payments
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own payments" on public.payments
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own payments" on public.payments
  for delete to authenticated using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- expenses -- new. Today's Expenses.tsx only sources from purchases; this
-- is the standalone entity for rent/electricity/transport etc. that the
-- app doesn't have a UI for yet.
-- ---------------------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  category text not null default 'other',
  description text,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_owner_date_idx on public.expenses (owner_id, date desc);

alter table public.expenses enable row level security;

create policy "Owner can select own expenses" on public.expenses
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner can insert own expenses" on public.expenses
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner can update own expenses" on public.expenses
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own expenses" on public.expenses
  for delete to authenticated using (auth.uid() = owner_id);

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();
