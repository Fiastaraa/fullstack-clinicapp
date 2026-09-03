import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

export default function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}) {
  const { user, isAuthenticated, isHydrating } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f5ef]">
        <div className="rounded-2xl bg-white px-6 py-5 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#168c9b] border-t-transparent mx-auto" />
          <p className="mt-3 text-sm font-semibold text-[#101a3d]">
            Restoring AssistDoc session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ?? <Outlet />;
}
