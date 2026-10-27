import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ShieldAlert,
  FileBarChart,
  HardDrive,
  TrendingUp,
  Settings,
  ClipboardList,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { useAdmin } from "../context/useAdmin.js";
import { SIDEBAR_NAV_ITEMS } from "../types/admin.js";

const ICON_MAP = {
  LayoutDashboard,
  Users,
  Calendar,
  ShieldAlert,
  FileBarChart,
  HardDrive,
  TrendingUp,
  Settings,
  ClipboardList,
  Activity,
};

export function AdminSidebar({ isMobile = false, onCloseMobile }) {
  const { sidebarCollapsed, toggleSidebar, currentAdmin } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const [expandedItems, setExpandedItems] = useState({
    settings: location.pathname.startsWith("/admin/settings") || location.pathname.startsWith("/admin/system"),
  });

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("adminUser");
    navigate("/login");
  };

  const collapsed = isMobile ? false : sidebarCollapsed;

  return (
    <aside
      className={`relative flex flex-col h-full bg-[#111827] text-slate-200 border-r border-slate-800 transition-all duration-300 ease-in-out select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <Link to="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight tracking-tight text-white">
                QR Snap
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Platform Admin
              </span>
            </div>
          )}
        </Link>

        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Admin Profile Badge */}
      {!collapsed && currentAdmin && (
        <div className="p-3 mx-3 my-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-semibold text-sm shrink-0">
            {currentAdmin.name ? currentAdmin.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-100 truncate">{currentAdmin.name}</span>
            <span className="text-[10px] text-amber-400/90 font-mono font-medium truncate">
              {currentAdmin.role}
            </span>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {SIDEBAR_NAV_ITEMS.map((item) => {
          const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive =
            location.pathname === item.path ||
            (item.children && item.children.some((c) => location.pathname === c.path));
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems[item.id];

          return (
            <div key={item.id} className="space-y-1">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
              ) : (
                <Link
                  to={item.path}
                  onClick={isMobile ? onCloseMobile : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )}

              {/* Submenu Children */}
              {hasChildren && !collapsed && isExpanded && (
                <div className="pl-9 pr-2 py-1 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = location.pathname === child.path;
                    return (
                      <Link
                        key={child.id}
                        to={child.path}
                        onClick={isMobile ? onCloseMobile : undefined}
                        className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isChildActive
                            ? "text-amber-400 font-semibold bg-amber-500/5"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer / Logout */}
      <div className="p-3 border-t border-slate-800 space-y-1">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
