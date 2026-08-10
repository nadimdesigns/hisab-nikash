-- hisab-nikash schema for a shared Supabase project.
-- Every object is prefixed hisab_nikash_ to avoid colliding with other apps'
-- tables/functions/types already in this project (app_role, has_role,
-- handle_new_user, profiles, user_roles all already exist for another app).
--
-- Deliberately no auth.users trigger: with several apps sharing one Auth
-- pool, a global trigger would create a hisab-nikash profile/role row for
-- every signup anywhere, not just this app's users. Instead
-- hisab_nikash_ensure_self() is called lazily by the client on first use.

CREATE TYPE public.hisab_nikash_role AS ENUM ('admin', 'user', 'demo');

CREATE TABLE public.hisab_nikash_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hisab_nikash_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hisab_nikash_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.hisab_nikash_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.hisab_nikash_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hisab_nikash_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE TRIGGER hisab_nikash_profiles_set_updated_at
BEFORE UPDATE ON public.hisab_nikash_profiles
FOR EACH ROW EXECUTE FUNCTION public.hisab_nikash_set_updated_at();

CREATE OR REPLACE FUNCTION public.hisab_nikash_has_role(_user_id uuid, _role public.hisab_nikash_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hisab_nikash_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Idempotently creates the caller's own profile + default 'user' role, then
-- returns the resolved role (admin > demo > user). Called lazily by the
-- client on first authenticated use instead of an auth.users trigger.
CREATE OR REPLACE FUNCTION public.hisab_nikash_ensure_self()
RETURNS public.hisab_nikash_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  resolved_role public.hisab_nikash_role;
  meta jsonb;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select raw_user_meta_data, email into meta, user_email
  from auth.users where id = auth.uid();

  insert into public.hisab_nikash_profiles (id, display_name, avatar_url)
  values (
    auth.uid(),
    coalesce(meta ->> 'full_name', meta ->> 'name', user_email),
    meta ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.hisab_nikash_user_roles (user_id, role)
  values (auth.uid(), 'user')
  on conflict (user_id, role) do nothing;

  select role into resolved_role
  from public.hisab_nikash_user_roles
  where user_id = auth.uid()
  order by case role when 'admin' then 0 when 'demo' then 1 else 2 end
  limit 1;

  return resolved_role;
end;
$$;

REVOKE ALL ON FUNCTION public.hisab_nikash_ensure_self() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hisab_nikash_ensure_self() TO authenticated;

CREATE OR REPLACE FUNCTION public.hisab_nikash_admin_list_users()
RETURNS TABLE(
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role public.hisab_nikash_role
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if not public.hisab_nikash_has_role(auth.uid(), 'admin') then
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
    (select ur.role from public.hisab_nikash_user_roles ur
     where ur.user_id = u.id
     order by case ur.role when 'admin' then 0 when 'demo' then 1 else 2 end
     limit 1) as role
  from auth.users u
  left join public.hisab_nikash_profiles p on p.id = u.id
  where exists (select 1 from public.hisab_nikash_user_roles ur where ur.user_id = u.id)
  order by u.last_sign_in_at desc nulls last, u.created_at desc;
end;
$$;

REVOKE ALL ON FUNCTION public.hisab_nikash_admin_list_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hisab_nikash_admin_list_users() TO authenticated;

-- profiles policies
CREATE POLICY "hisab_nikash: users can view their own profile"
  ON public.hisab_nikash_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "hisab_nikash: users can update their own profile"
  ON public.hisab_nikash_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "hisab_nikash: admins can view all profiles"
  ON public.hisab_nikash_profiles FOR SELECT
  TO authenticated
  USING (public.hisab_nikash_has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "hisab_nikash: users can view their own roles"
  ON public.hisab_nikash_user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "hisab_nikash: admins can view all roles"
  ON public.hisab_nikash_user_roles FOR SELECT
  TO authenticated
  USING (public.hisab_nikash_has_role(auth.uid(), 'admin'));

CREATE POLICY "hisab_nikash: admins can insert roles"
  ON public.hisab_nikash_user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.hisab_nikash_has_role(auth.uid(), 'admin'));

CREATE POLICY "hisab_nikash: admins can delete roles"
  ON public.hisab_nikash_user_roles FOR DELETE
  TO authenticated
  USING (public.hisab_nikash_has_role(auth.uid(), 'admin'));
