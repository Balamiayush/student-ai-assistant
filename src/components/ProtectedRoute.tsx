import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { requireAuth, getDefaultRedirectPath } from "@/middleware/auth";
import { requireRole } from "@/middleware/role";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: AppRole;
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const authState = useAuth();
  const { user, role, loading } = authState;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // 1. Auth check
  if (!requireAuth(authState)) {
    return <Navigate to="/auth" replace />;
  }

  // 2. Role check
  if (!requireRole(role, allowedRole)) {
    return <Navigate to={getDefaultRedirectPath(role)} replace />;
  }

  return <>{children}</>;
}
