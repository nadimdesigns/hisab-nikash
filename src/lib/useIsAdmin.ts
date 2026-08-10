import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isDemoMode, setCachedRole, type CachedRole } from "@/lib/demoMode";

type Role = CachedRole;

/**
 * Fetches and caches the signed-in user's role from `user_roles`.
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
    if (!user || isDemoMode()) {
      setRole(null);
      setCachedRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role as Role);
        // Admin trumps demo trumps user.
        const resolved: Role = roles.includes("admin")
          ? "admin"
          : roles.includes("demo")
            ? "demo"
            : "user";
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
