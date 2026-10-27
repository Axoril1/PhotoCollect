import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import CreateEventPage from './pages/CreateEventPage.jsx'
import EventGalleryPage from './pages/EventGalleryPage.jsx'
import SocketProvider from './services/socket/socketProvider.jsx'
import AdminRoutes from './admin/routes/AdminRoutes.jsx'

const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage.jsx'))
const BillingPage = lazy(() => import('./pages/BillingPage.jsx'))
const OrganizerAnalyticsPage = lazy(() => import('./pages/OrganizerAnalyticsPage.jsx'))
const BrandingSettingsPage = lazy(() => import('./pages/BrandingSettingsPage.jsx'))
const GrowthDashboardPage = lazy(() => import('./pages/GrowthDashboardPage.jsx'))

function App() {
  return (
    <SocketProvider>
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
        <Routes>
          <Route path="/" element={<CreateEventPage />} />
          <Route path="/event/:slug" element={<EventGalleryPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/analytics" element={<OrganizerAnalyticsPage />} />
          <Route path="/dashboard/analytics" element={<OrganizerAnalyticsPage />} />
          <Route path="/branding" element={<BrandingSettingsPage />} />
          <Route path="/dashboard/branding" element={<BrandingSettingsPage />} />
          <Route path="/growth" element={<GrowthDashboardPage />} />
          <Route path="/dashboard/growth" element={<GrowthDashboardPage />} />
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </SocketProvider>
  )
}

export default App
