import { useAdmin } from "../context/useAdmin.js";

export function useSidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileDrawerOpen,
    toggleMobileDrawer,
    closeMobileDrawer,
  } = useAdmin();

  return {
    collapsed: sidebarCollapsed,
    toggle: toggleSidebar,
    mobileOpen: mobileDrawerOpen,
    toggleMobile: toggleMobileDrawer,
    closeMobile: closeMobileDrawer,
  };
}

export default useSidebar;
