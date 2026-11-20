import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode, setCachedRole, type CachedRole } from "@/lib/demoMode";
type Role = CachedRole;

/** Resolved role per user id, so route changes don't repeat the network call. */
const roleCache = new Map<string, Role>();
const inflight = new Map<string, Promise<Role>>();

function resolveRole(userId: string): Promise<Role> {
  let p = inflight.get(userId);
  if (!p) {
    p = Promise.resolve(supabase.rpc("hisab_nikash_ensure_self"))
      .then(({ data, error }): Role => {
        const r: Role = data === "admin" ? "admin" : null;
        // Don't cache failures: retry on the next mount instead.
        if (!error) roleCache.set(userId, r);
        return r;
      })
      .finally(() => inflight.delete(userId));
    inflight.set(userId, p);
  }
  return p;
}

/**
 * Fetches and caches the signed-in user's role from `hisab_nikash_user_roles`.
 * Side effect: mirrors the role into localStorage so the synchronous
 * `isReadOnly()` guard inside zustand stores can react to "demo" users
 * without awaiting an async lookup.
 */
export function useUserRole(): { role: Role | null; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(() =>
    user && roleCache.has(user.id) ? (roleCache.get(user.id) ?? null) : null,
  );
  const [loading, setLoading] = useState(() => !(user && roleCache.has(user.id)));

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user || isDemoMode()) {
      setRole(null);
      setCachedRole(null);
      setLoading(false);
      return;
    }
    if (roleCache.has(user.id)) {
      const cached = roleCache.get(user.id) ?? null;
      setRole(cached);
      setCachedRole(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Lazily creates this user's hisab_nikash_profiles/hisab_nikash_user_roles
    // row on first call (idempotent) and returns their resolved role. There is
    // no auth.users trigger for this, since this Supabase project is shared
    // with other apps and a global trigger would fire on every signup there.
    resolveRole(user.id).then((resolved) => {
      if (cancelled) return;
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
