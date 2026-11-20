-- Used by the login screen (before sign-in, so callable by anon) to decide
-- between "enter PIN" and "set new PIN". Only looks at this app's synthetic
-- <digits>@hisabnikash.com emails so other apps' users are never matched.
CREATE OR REPLACE FUNCTION public.hisab_nikash_phone_has_account(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = regexp_replace(coalesce(_phone, ''), '\D', '', 'g') || '@hisabnikash.com'
  )
$$;

REVOKE ALL ON FUNCTION public.hisab_nikash_phone_has_account(text) FROM public;
GRANT EXECUTE ON FUNCTION public.hisab_nikash_phone_has_account(text) TO anon, authenticated;
