# Schema for Supabase project `cjjlylmaekwluufsasea`

**This directory is deliberately kept out of `supabase/migrations/`.**

`supabase/config.toml` in this repo links to a *different* Supabase project
(`fijzdgrhqatquytwszqg` — the original PharmaSee backend). If these files
lived in `supabase/migrations/`, running `supabase db push` from this repo
would apply them to the wrong project. Everything here targets
`https://cjjlylmaekwluufsasea.supabase.co` instead, and must be applied to
*that* project specifically — via the Supabase MCP `apply_migration` tool
pointed at it, or by pasting into that project's SQL editor in the
dashboard. Do not run `supabase db push` against this directory.

## Files, in order

1. `001_auth_scaffolding.sql` — `profiles`, `app_role` enum, `user_roles`,
   `has_role()`, `handle_new_user()`, `admin_list_users()`, and the
   `updated_at` trigger machinery. Required for `RequireAuth`,
   `useIsAdmin`, and `UserManagement` in the app to function at all against
   this project. This is a clean-room replay of the *fixed* version of
   `supabase/migrations/` — it defaults new signups to the `'user'` role
   and has **no** hardcoded auto-admin email (the original project's
   `handle_new_user()` silently defaulted new users to a read-only `'demo'`
   role and had an email-based admin backdoor; see the repo's Phase 0
   commit for the writeup). It also does **not** replay the two migrations
   that inserted a plaintext admin password into `auth.users` — that
   account and its credential belong to the old project only.

2. `002_business_schema.sql` — `products`, `customers`, `suppliers`,
   `sales`, `sale_items`, `purchases`, `purchase_items`, `dues`,
   `payments`, `expenses`. Every table is scoped by a direct
   `owner_id uuid references auth.users(id)` (single shop per account —
   no multi-staff/shops table) with RLS restricting all four operations to
   `auth.uid() = owner_id`. Field names and types mirror the current
   Zustand store (`src/store/shop.ts`, `src/lib/customerPayments.ts`,
   `src/lib/customerPaymentsLog.ts`) so a future integration is a
   mechanical mapping, not a redesign.

## What this does NOT do

- Does **not** change `.env` or Vercel env vars. The deployed app still
  reads/writes `fijzdgrhqatquytwszqg` and localStorage exactly as before.
  This schema sits ready and unused until an explicit decision is made to
  cut the app over.
- Does **not** seed an admin user. The old project's seed migration
  inserted a specific hardcoded UUID that has no meaning here. After your
  first real signup against this project, grant yourself admin manually:
  `insert into public.user_roles (user_id, role) values ('<your-auth-uid>', 'admin');`
- Does **not** add a supplier payable/dues ledger. The app has no
  supplier-ledger UI or logic yet (`Purchases.tsx` uses a free-text
  supplier name with no dues concept) — building that schema now would be
  guessing its shape before the feature exists.
