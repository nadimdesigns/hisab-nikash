-- Auth scaffolding for a fresh Supabase project backing হিসাব নিকাশ.
--
-- Clean-room replay of the FIXED version of this repo's supabase/migrations/
-- history — see supabase/cjjlylmaekwluufsasea/README.md for what's
-- deliberately different from the original (no auto-admin backdoor, no
-- silent demo-role default, no plaintext password seed).

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- updated_at trigger machinery, shared by every table below
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------

-- Declared with all three values up front (unlike the original project,
-- which had to ALTER TYPE ... ADD VALUE 'demo' in a later, separate
-- migration because you cannot add an enum value in the same transaction
-- that creates the type when it's already in use elsewhere).
create type public.app_role as enum ('admin', 'user', 'demo');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security-definer role checker, avoids recursive RLS on user_roles itself.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- signup trigger
-- ---------------------------------------------------------------------

-- FIXED version: new users default to 'user' (able to use the app
-- immediately), not 'demo' (silently read-only). No email-based
-- auto-admin backdoor. Grant admin manually after your first signup --
-- see the README in this directory.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- admin user list RPC, backs UserManagement.tsx
-- ---------------------------------------------------------------------

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role public.app_role
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    p.avatar_url,
    u.created_at,
    u.last_sign_in_at,
    (select ur.role from public.user_roles ur where ur.user_id = u.id order by ur.role limit 1) as role
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.last_sign_in_at desc nulls last, u.created_at desc;
end;
$$;
