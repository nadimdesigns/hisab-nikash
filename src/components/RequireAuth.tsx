import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/lib/useIsAdmin";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { session, loading } = useAuth();
  // Side-effect only: caches the user's role to localStorage so the synchronous
  // `isReadOnly()` guard used by stores can react to demo-role users.
  useUserRole();

  if (loading) {
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
