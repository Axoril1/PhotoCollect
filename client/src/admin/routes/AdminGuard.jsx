import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import AdminForbiddenPage from "../pages/errors/AdminForbiddenPage.jsx";

export function AdminGuard() {
  const { isAuthenticated, isAdmin } = useAdminAuth();

  if (!isAuthenticated) {
    // Redirect unauthenticated visitors to login
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // Render custom 403 Forbidden error page for unauthorized role (e.g. Organizer/Guest)
    return <AdminForbiddenPage />;
  }

  return <Outlet />;
}

export default AdminGuard;
