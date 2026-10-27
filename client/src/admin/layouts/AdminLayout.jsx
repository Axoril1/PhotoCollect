import { Outlet } from "react-router-dom";
import { X } from "lucide-react";
import { useAdmin } from "../context/useAdmin.js";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminTopNav from "../components/AdminTopNav.jsx";
import AdminFooter from "../components/AdminFooter.jsx";
import AdminErrorBoundary from "../components/AdminErrorBoundary.jsx";
import LoadingOverlay from "../components/LoadingOverlay.jsx";
import useBreadcrumbs from "../hooks/useBreadcrumbs.js";

export function AdminLayout() {
  const { sidebarCollapsed, mobileDrawerOpen, closeMobileDrawer, isLoading, loadingMessage } =
    useAdmin();

  // Initialize dynamic breadcrumbs listener
  useBreadcrumbs();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 font-body antialiased">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block shrink-0 h-full">
        <AdminSidebar />
      </div>

      {/* Responsive Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            onClick={closeMobileDrawer}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          />
          {/* Mobile Sidebar Content */}
          <div className="relative flex-1 max-w-xs w-full bg-[#111827] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <button
              onClick={closeMobileDrawer}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminSidebar isMobile onCloseMobile={closeMobileDrawer} />
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <AdminTopNav />

        {/* Dynamic Outlet Page Content with Error Boundary */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#0b0f19]">
          <div className="max-w-7xl mx-auto min-h-[calc(100vh-10rem)]">
            <AdminErrorBoundary>
              <Outlet />
            </AdminErrorBoundary>
          </div>
        </main>

        <AdminFooter />
      </div>

      {/* Global Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
    </div>
  );
}

export default AdminLayout;
