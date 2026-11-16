import type { Session, User } from "@supabase/supabase-js";

const OFFLINE_USER: User = {
  id: "local-user",
  email: "user@hisabnikash.local",
  user_metadata: { full_name: "হিসাব নিকাশ", name: "হিসাব নিকাশ" },
  app_metadata: { provider: "offline" },
  aud: "authenticated",
  created_at: new Date(0).toISOString(),
} as unknown as User;

const OFFLINE_SESSION: Session = {
  access_token: "offline-token",
  refresh_token: "offline-token",
  expires_in: 3153600000,
  expires_at: Math.floor(Date.now() / 1000) + 3153600000,
  token_type: "bearer",
  user: OFFLINE_USER,
} as unknown as Session;

/**
 * Native Android Offline Auth:
 * Returns an instant offline user session without network/Supabase roundtrip.
 */
export function useAuth() {
  return {
    session: OFFLINE_SESSION,
    user: OFFLINE_USER,
    loading: false,
  };
}

export async function signOut(): Promise<void> {
  /* Offline app — no-op */
}
