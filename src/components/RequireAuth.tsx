import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/lib/useIsAdmin";
import { isDemoMode } from "@/lib/demoMode";
import { activateAccount, getActiveAccount } from "@/lib/accountScope";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { session, loading } = useAuth();
  // Side-effect only: caches the user's role to localStorage so the synchronous
  // `isReadOnly()` guard used by stores can react to demo-role users.
  useUserRole();

  // Stores read their (per-account) storage keys when the page loads. If the signed-in account is
  // not the one the stores were loaded for (first launch after this update, or a different
  // account on this phone), switch to its own data and reload once.
  const accountMismatch = !loading && !!session && !isDemoMode() && getActiveAccount() !== session.user.id;
  if (accountMismatch && session) {
    activateAccount(session.user.id, { isNew: false });
    if (getActiveAccount() === session.user.id) window.location.reload(); // (no reload loop if storage is unavailable)
  }

  if (loading || accountMismatch) {
    return (
      <div className="flex h-[100svh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
