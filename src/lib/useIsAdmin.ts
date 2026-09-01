import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { setCachedRole, type CachedRole } from "@/lib/demoMode";
type Role = CachedRole;

/**
 * Fetches and caches the signed-in user's role from `hisab_nikash_user_roles`.
 * Side effect: mirrors the role into localStorage so the synchronous
 * `isReadOnly()` guard inside zustand stores can react to "demo" users
 * without awaiting an async lookup.
 */
export function useUserRole(): { role: Role | null; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setCachedRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Lazily creates this user's hisab_nikash_profiles/hisab_nikash_user_roles
    // row on first call (idempotent) and returns their resolved role. There is
    // no auth.users trigger for this, since this Supabase project is shared
    // with other apps and a global trigger would fire on every signup there.
    supabase
      .rpc("hisab_nikash_ensure_self")
      .then(({ data }) => {
        if (cancelled) return;
        const resolved: Role = data === "admin" ? "admin" : null;
        setRole(resolved);
        setCachedRole(resolved);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { role, loading };
}

/**
 * Backwards-compatible convenience: returns whether the current user is an
 * admin. Internally consumes `useUserRole`.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { role, loading } = useUserRole();
  return { isAdmin: role === "admin", loading };
}
