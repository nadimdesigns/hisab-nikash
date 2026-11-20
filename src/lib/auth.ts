import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode, disableDemoMode, DEMO_EMAIL, setCachedRole } from "@/lib/demoMode";

/**
 * A minimal in-memory "session" used for the client-side demo account.
 * It is NOT a real Supabase session — it only satisfies the auth guard so
 * the demo user can browse the app while writing to namespaced storage.
 */
function buildDemoSession(): { session: Session; user: User } {
  const user = {
    id: "demo-user",
    email: DEMO_EMAIL,
    user_metadata: { full_name: "Demo User", name: "Demo User" },
    app_metadata: { provider: "demo" },
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as unknown as User;
  const session = {
    access_token: "demo",
    refresh_token: "demo",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  } as unknown as Session;
  return { session, user };
}

/**
 * Last known session, shared across hook instances. Every route mounts its own
 * `RequireAuth`, so without this each page navigation would restart in the
 * "loading" state and flash a spinner while the session is re-read.
 * `undefined` = not resolved yet, `null` = resolved as signed out.
 */
let cachedSession: Session | null | undefined;

/**
 * React hook returning the current Supabase session and user.
 * When demo mode is active, returns a synthetic demo session instead of
 * touching Supabase auth.
 */
export function useAuth() {
  const [demoActive, setDemoActive] = useState<boolean>(() => isDemoMode());
  const [session, setSession] = useState<Session | null>(() => {
    return isDemoMode() ? buildDemoSession().session : (cachedSession ?? null);
  });
  const [user, setUser] = useState<User | null>(() => {
    return isDemoMode() ? buildDemoSession().user : (cachedSession?.user ?? null);
  });
  const [loading, setLoading] = useState<boolean>(() => !isDemoMode() && cachedSession === undefined);

  useEffect(() => {
    if (demoActive) {
      const { session: s, user: u } = buildDemoSession();
      setSession(s);
      setUser(u);
      setLoading(false);
      return;
    }

    let isMounted = true;
    // Timeout safeguard: if Supabase takes more than 1.2s to reply or is offline, unblock loading
    const timeoutTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1200);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isMounted) return;
      clearTimeout(timeoutTimer);
      cachedSession = s;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        if (!isMounted) return;
        clearTimeout(timeoutTimer);
        cachedSession = s;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
      sub.subscription.unsubscribe();
    };
  }, [demoActive]);

  // React to demo flag flips elsewhere in the app.
  useEffect(() => {
    const onStorage = () => setDemoActive(isDemoMode());
    window.addEventListener("storage", onStorage);
    window.addEventListener("pharmasee-demo-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pharmasee-demo-changed", onStorage);
    };
  }, []);

  return { session, user, loading };
}

export async function signOut(): Promise<void> {
  setCachedRole(null);
  cachedSession = null;
  if (isDemoMode()) {
    disableDemoMode();
    window.dispatchEvent(new Event("pharmasee-demo-changed"));
    // Reload so all persisted stores re-init with non-demo keys.
    window.location.reload();
    return;
  }
  await supabase.auth.signOut();
}
