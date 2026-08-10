-- Fix two defects in handle_new_user():
--
-- 1. Every new signup was assigned the 'demo' role. The client treats 'demo' as
--    read-only (isReadOnly() in src/lib/demoMode.ts), so a real shop owner who
--    registered could browse the app but could not record a single sale.
--    New users now get 'user'.
--
-- 2. Signup is open, and the function promoted anyone registering with one
--    specific address to 'admin'. Whoever controls that mailbox could grant
--    themselves admin on this project. The email check is removed; admin is
--    now granted only by an existing admin through user_roles.
--
-- Existing accounts are deliberately left alone: a 'demo' row created before
-- this migration may be a real shop owner or an intentional demo login, and
-- the two are indistinguishable from SQL. An admin can correct them from the
-- user management screen.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
