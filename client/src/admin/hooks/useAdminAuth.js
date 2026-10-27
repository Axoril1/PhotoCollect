import { useAdmin } from "../context/useAdmin.js";
import { ADMIN_ROLES } from "../types/admin.js";

export function useAdminAuth() {
  const { currentAdmin } = useAdmin();

  const isSuperAdmin = currentAdmin?.role === ADMIN_ROLES.SUPER_ADMIN;
  const isAdmin = currentAdmin?.role === ADMIN_ROLES.ADMIN || isSuperAdmin;
  const isAuthenticated = Boolean(currentAdmin && currentAdmin.id);

  const hasPermission = (permission) => {
    if (!isAuthenticated || !isAdmin) return false;
    if (isSuperAdmin) return true;
    // Map permissions or check permissions version
    return true;
  };

  return {
    currentAdmin,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    hasPermission,
  };
}

export default useAdminAuth;
