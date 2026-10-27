import { useState } from "react";
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ShieldCheck,
  UserCheck,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAdmin } from "../context/useAdmin.js";
import AdminBreadcrumb from "./AdminBreadcrumb.jsx";

export function AdminTopNav() {
  const {
    currentAdmin,
    pageTitle,
    notifications,
    toggleMobileDrawer,
    darkMode,
    toggleDarkMode,
  } = useAdmin();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[#111827]/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-sm">
      {/* Left Section: Mobile Menu Toggle + Title & Breadcrumbs */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <button
          onClick={toggleMobileDrawer}
          className="p-2 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="font-display text-lg md:text-xl font-bold text-white tracking-tight truncate">
            {pageTitle}
          </h1>
          <div className="hidden sm:block">
            <AdminBreadcrumb />
          </div>
        </div>
      </div>

      {/* Right Section: Controls, Search, Notifications, Admin Profile */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Global Admin Search Placeholder */}
        <div className="relative hidden lg:block w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search users, events, logs..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
          />
        </div>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 space-y-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {unreadCount} New
                </span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.message}</p>
                    <span className="text-[9px] text-slate-500 mt-1 block">{n.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-xs shadow-md">
              {currentAdmin?.name ? currentAdmin.name.charAt(0).toUpperCase() : "A"}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-200 max-w-[100px] truncate">
              {currentAdmin?.name || "Admin"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2.5 mb-1 rounded-xl bg-slate-800/50">
                <p className="text-xs font-bold text-white truncate">{currentAdmin?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentAdmin?.email}</p>
                <span className="inline-block mt-1 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {currentAdmin?.role}
                </span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("accessToken");
                  window.location.href = "/login";
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminTopNav;
