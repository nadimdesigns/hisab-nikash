/** APK variant of src/lib/useIsAdmin.ts: the single local user is always the admin. */
export type CachedRole = "admin" | null;

export function useUserRole(): { role: CachedRole; loading: boolean } {
  return { role: "admin", loading: false };
}

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  return { isAdmin: true, loading: false };
}
