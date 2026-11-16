export type CachedRole = "admin" | null;

export function useUserRole(): { role: CachedRole; loading: boolean } {
  return { role: "admin", loading: false };
}

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  return { isAdmin: true, loading: false };
}
