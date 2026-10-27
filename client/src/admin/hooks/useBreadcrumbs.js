import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAdmin } from "../context/useAdmin.js";

const ROUTE_NAME_MAP = {
  admin: "Admin",
  dashboard: "Dashboard",
  users: "Users",
  events: "Events",
  moderation: "Moderation Queue",
  reports: "Reports & Audits",
  storage: "Storage Management",
  analytics: "Platform Analytics",
  settings: "Settings",
  system: "System Health",
  audit: "Audit Logs",
};

export function useBreadcrumbs() {
  const location = useLocation();
  const { breadcrumbs, setBreadcrumbs, setPageTitle } = useAdmin();

  useEffect(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const newCrumbs = [];

    let currentPath = "";
    segments.forEach((seg, idx) => {
      currentPath += `/${seg}`;
      const name = ROUTE_NAME_MAP[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
      newCrumbs.push({
        label: name,
        path: currentPath,
        isLast: idx === segments.length - 1,
      });
    });

    setBreadcrumbs(newCrumbs);

    // Set page title to last breadcrumb item
    if (newCrumbs.length > 0) {
      const lastLabel = newCrumbs[newCrumbs.length - 1].label;
      setPageTitle(lastLabel);
    }
  }, [location.pathname, setBreadcrumbs, setPageTitle]);

  return breadcrumbs;
}

export default useBreadcrumbs;
