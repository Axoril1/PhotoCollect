import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout.jsx";
import AdminGuard from "./AdminGuard.jsx";
import PageTransitionLoader from "../components/PageTransitionLoader.jsx";
import { AdminProvider } from "../context/AdminContext.jsx";

import AdminForbiddenPage from "../pages/errors/AdminForbiddenPage.jsx";

// Lazy-loaded Admin Page Modules
const AdminDashboardPage = lazy(() => import("../pages/AdminDashboardPage.jsx"));
const AdminUsersPage = lazy(() => import("../pages/AdminUsersPage.jsx"));
const AdminUserProfilePage = lazy(() => import("../pages/AdminUserProfilePage.jsx"));
const AdminOrganizersPage = lazy(() => import("../pages/AdminOrganizersPage.jsx"));
const AdminOrganizerProfilePage = lazy(() => import("../pages/AdminOrganizerProfilePage.jsx"));
const AdminEventsPage = lazy(() => import("../pages/AdminEventsPage.jsx"));
const AdminEventDetailPage = lazy(() => import("../pages/AdminEventDetailPage.jsx"));
const AdminModerationPage = lazy(() => import("../pages/AdminModerationPage.jsx"));
const AdminPhotoReviewPage = lazy(() => import("../pages/AdminPhotoReviewPage.jsx"));
const AdminModerationHistoryPage = lazy(() => import("../pages/AdminModerationHistoryPage.jsx"));
const AdminModerationSettingsPage = lazy(() => import("../pages/AdminModerationSettingsPage.jsx"));
const AdminReportsPage = lazy(() => import("../pages/AdminReportsPage.jsx"));
const AdminReportDetailPage = lazy(() => import("../pages/AdminReportDetailPage.jsx"));
const AdminReportsHistoryPage = lazy(() => import("../pages/AdminReportsHistoryPage.jsx"));
const AdminReportsStatisticsPage = lazy(() => import("../pages/AdminReportsStatisticsPage.jsx"));
const AdminStoragePage = lazy(() => import("../pages/AdminStoragePage.jsx"));
const AdminStorageBrowserPage = lazy(() => import("../pages/AdminStorageBrowserPage.jsx"));
const AdminStorageFileDetailPage = lazy(() => import("../pages/AdminStorageFileDetailPage.jsx"));
const AdminStorageCleanupPage = lazy(() => import("../pages/AdminStorageCleanupPage.jsx"));
const AdminSubscriptionsPage = lazy(() => import("../pages/AdminSubscriptionsPage.jsx"));
const AdminWebhooksPage = lazy(() => import("../pages/AdminWebhooksPage.jsx"));
const AdminAnalyticsPage = lazy(() => import("../pages/AdminAnalyticsPage.jsx"));
const AdminSettingsPage = lazy(() => import("../pages/AdminSettingsPage.jsx"));
const AdminSystemHealthPage = lazy(() => import("../pages/AdminSystemHealthPage.jsx"));
const AdminAuditLogsPage = lazy(() => import("../pages/AdminAuditLogsPage.jsx"));
const AdminManagementPage = lazy(() => import("../pages/AdminManagementPage.jsx"));

// Lazy-loaded Error Pages
const AdminNotFoundPage = lazy(() => import("../pages/errors/AdminNotFoundPage.jsx"));
const AdminServerErrorPage = lazy(() => import("../pages/errors/AdminServerErrorPage.jsx"));

export function AdminRoutes() {
  return (
    <AdminProvider>
      <Suspense fallback={<PageTransitionLoader />}>
        <Routes>
          {/* RBAC Route Guard */}
          <Route element={<AdminGuard />}>
            {/* Admin Shell Layout */}
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:id" element={<AdminUserProfilePage />} />
              <Route path="organizers" element={<AdminOrganizersPage />} />
              <Route path="organizers/:id" element={<AdminOrganizerProfilePage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="events/:id" element={<AdminEventDetailPage />} />
              <Route path="events/:id/analytics" element={<AdminEventDetailPage />} />
              <Route path="events/:id/storage" element={<AdminEventDetailPage />} />
              <Route path="events/:id/moderation" element={<AdminEventDetailPage />} />
              <Route path="events/:id/activity" element={<AdminEventDetailPage />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="moderation/:photoId" element={<AdminPhotoReviewPage />} />
              <Route path="moderation/history" element={<AdminModerationHistoryPage />} />
              <Route path="moderation/settings" element={<AdminModerationSettingsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="reports/:reportId" element={<AdminReportDetailPage />} />
              <Route path="reports/history" element={<AdminReportsHistoryPage />} />
              <Route path="reports/statistics" element={<AdminReportsStatisticsPage />} />
              <Route path="storage" element={<AdminStoragePage />} />
              <Route path="storage/browser" element={<AdminStorageBrowserPage />} />
              <Route path="storage/files/:fileId" element={<AdminStorageFileDetailPage />} />
              <Route path="storage/cleanup" element={<AdminStorageCleanupPage />} />
              <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
              <Route path="billing/webhooks" element={<AdminWebhooksPage />} />
              <Route path="webhooks" element={<AdminWebhooksPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="system" element={<AdminSystemHealthPage />} />
              <Route path="audit" element={<AdminAuditLogsPage />} />
              <Route path="admins" element={<AdminManagementPage />} />
              <Route path="403" element={<AdminForbiddenPage />} />
              <Route path="500" element={<AdminServerErrorPage />} />
              <Route path="*" element={<AdminNotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AdminProvider>
  );
}

export default AdminRoutes;
