import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ADMIN_ROLES } from "../types/admin.js";

export const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  // Current admin user state (Mock initial verified identity for layout demonstration)
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    const stored = localStorage.getItem("adminUser");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (_) {}
    }
    return {
      id: "admin_01",
      name: "Alex Vance",
      email: "alex.vance@qrsnap.com",
      role: ADMIN_ROLES.SUPER_ADMIN,
      avatar: "",
      permissionsVersion: 1,
    };
  });

  // Sidebar collapsed state remembered in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("adminSidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Responsive mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Active notifications list
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "System Update Available",
      message: "Platform v4.2 migration scheduled for midnight UTC.",
      type: "info",
      timestamp: "10m ago",
      read: false,
    },
    {
      id: "2",
      title: "Moderation Alert",
      message: "14 new flagged uploads awaiting review.",
      type: "warning",
      timestamp: "1h ago",
      read: false,
    },
  ]);

  // Dynamic breadcrumbs trail
  const [breadcrumbs, setBreadcrumbs] = useState([
    { label: "Admin", path: "/admin" },
    { label: "Dashboard", path: "/admin/dashboard" },
  ]);

  // Page header state
  const [pageTitle, setPageTitle] = useState("Dashboard");

  // Global & route loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Dark mode / Theme state (default dark for modern SaaS command bar)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("adminDarkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem("adminDarkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileDrawer = useCallback(() => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const markNotificationAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showLoading = useCallback((message = "Loading...") => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage("");
  }, []);

  const value = {
    currentAdmin,
    setCurrentAdmin,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    toggleMobileDrawer,
    closeMobileDrawer,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    breadcrumbs,
    setBreadcrumbs,
    pageTitle,
    setPageTitle,
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    darkMode,
    toggleDarkMode,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
