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
 * The session supabase-js keeps in localStorage. When the phone is offline an expired access
 * token cannot be refreshed, supabase-js then reports "no session" and the app would throw the
 * user out to /login, where they cannot sign in without internet. Offline we keep trusting the
 * stored session on this device (signing out removes it); online the normal refresh applies.
 */
function readStoredSession(): Session | null {
  try {
    const host = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0];
    const raw = localStorage.getItem(`sb-${host}-auth-token`);
    const stored = raw ? JSON.parse(raw) : null;
    return stored?.user && stored?.refresh_token ? (stored as Session) : null;
  } catch {
    return null;
  }
}

const withOfflineGrace = (s: Session | null): Session | null =>
  s ?? (typeof navigator !== "undefined" && !navigator.onLine ? readStoredSession() : null);

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
      if (!isMounted) return;
      const grace = withOfflineGrace(null);
      if (grace) {
        cachedSession = grace;
        setSession(grace);
        setUser(grace.user);
      }
      setLoading(false);
    }, 1200);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, raw) => {
      const s = withOfflineGrace(raw);
      // Cache first: a sign-in event can arrive just after the screen that started it unmounted,
      // and the next screen (RequireAuth) must still see the new session.
      cachedSession = s;
      if (!isMounted) return;
      clearTimeout(timeoutTimer);
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session: raw } }) => {
        const s = withOfflineGrace(raw);
        cachedSession = s;
        if (!isMounted) return;
        clearTimeout(timeoutTimer);
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

/**
 * Set on sign-out so the login screen opens straight on the phone step instead
 * of replaying the shop-type onboarding. sessionStorage (not router state) so it
 * also survives the page reload that demo-mode sign-out triggers.
 */
export const SKIP_ONBOARDING_KEY = "hisab-nikash-skip-onboarding";

export async function signOut(): Promise<void> {
  try {
    sessionStorage.setItem(SKIP_ONBOARDING_KEY, "1");
  } catch {
    /* storage unavailable: fall back to the normal onboarding */
  }
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
