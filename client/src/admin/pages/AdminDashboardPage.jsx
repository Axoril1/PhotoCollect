import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  Image as ImageIcon,
  UploadCloud,
  HardDrive,
  ShieldAlert,
  AlertOctagon,
  DollarSign,
  Activity,
  RefreshCw,
  TrendingUp,
  LayoutDashboard,
  Zap,
} from "lucide-react";

import { useAdmin } from "../context/useAdmin.js";
import PageHeader from "../components/PageHeader.jsx";
import MetricCard from "../components/dashboard/MetricCard.jsx";
import QuickActionCard from "../components/dashboard/QuickActionCard.jsx";
import StatusCard from "../components/dashboard/StatusCard.jsx";
import AIModerationSummaryWidget from "../components/dashboard/AIModerationSummaryWidget.jsx";
import StorageSummaryWidget from "../components/dashboard/StorageSummaryWidget.jsx";
import TimelineCard from "../components/dashboard/TimelineCard.jsx";
import ChartCard from "../components/dashboard/ChartCard.jsx";
import DashboardGrid from "../components/dashboard/DashboardGrid.jsx";
import SectionTitle from "../components/dashboard/SectionTitle.jsx";
import dashboardService from "../services/dashboard.service.js";

export function AdminDashboardPage() {
  const { currentAdmin } = useAdmin();

  // State management for live dashboard widgets
  const [data, setData] = useState({
    metrics: null,
    systemStatus: [],
    moderation: null,
    storage: null,
    activity: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const result = await dashboardService.loadDashboardData();
      setData(result);
      setErrorState(null);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[Dashboard] Failed to refresh platform dashboard:", err);
      setErrorState(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    fetchDashboardData(true);
  };

  const metrics = data.metrics || {};

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-[#111827] to-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Platform Overview • Command Center</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
            Welcome back, {currentAdmin?.name || "Administrator"}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time status monitor and operational governance for the QR Snap platform.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Last Synchronized</span>
            <span className="text-xs text-slate-300 font-semibold">{lastRefreshed.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Dashboard"}</span>
          </button>
        </div>
      </div>

      {/* 2. Platform Summary Cards (10 Key Platform Metrics) */}
      <div>
        <SectionTitle
          title="Platform Summary Metrics"
          description="High-level operational metrics across users, events, storage, and moderation."
        />
        <DashboardGrid cols={4}>
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            change="+12%"
            changeType="increase"
            description="vs last month"
            icon={Users}
            isLoading={isLoading}
          />
          <MetricCard
            title="Total Organizers"
            value={metrics.totalOrganizers}
            change="+8%"
            changeType="increase"
            description="Active accounts"
            icon={UserCheck}
            isLoading={isLoading}
          />
          <MetricCard
            title="Total Events"
            value={metrics.totalEvents}
            change="+15%"
            changeType="increase"
            description="Hosted galleries"
            icon={Calendar}
            isLoading={isLoading}
          />
          <MetricCard
            title="Total Images"
            value={metrics.totalImages}
            change="+24%"
            changeType="increase"
            description="Stored photos"
            icon={ImageIcon}
            isLoading={isLoading}
          />
          <MetricCard
            title="Uploads Today"
            value={metrics.uploadsToday}
            change="+5%"
            changeType="increase"
            description="Last 24 hours"
            icon={UploadCloud}
            isLoading={isLoading}
          />
          <MetricCard
            title="Storage Used"
            value={metrics.storageUsed}
            change="+1.2 GB"
            changeType="neutral"
            description="Cloudflare R2"
            icon={HardDrive}
            isLoading={isLoading}
          />
          <MetricCard
            title="Pending Moderation"
            value={metrics.pendingModeration}
            change="Queue"
            changeType="neutral"
            description="Requires review"
            icon={ShieldAlert}
            isLoading={isLoading}
          />
          <MetricCard
            title="Reported Images"
            value={metrics.reportedImages}
            change="0 new"
            changeType="neutral"
            description="User reports"
            icon={AlertOctagon}
            isLoading={isLoading}
          />
          <MetricCard
            title="Platform Revenue"
            value={metrics.revenue || "$0.00"}
            change="Pro & Studio"
            changeType="neutral"
            description="Placeholder"
            icon={DollarSign}
            isLoading={isLoading}
          />
          <MetricCard
            title="API Requests Today"
            value={metrics.apiRequestsToday}
            change="99.9%"
            changeType="increase"
            description="System uptime"
            icon={Activity}
            isLoading={isLoading}
          />
        </DashboardGrid>
      </div>

      {/* 3. Quick Console Actions */}
      <QuickActionCard />

      {/* 4. Infrastructure System Status */}
      <StatusCard
        services={data.systemStatus}
        isLoading={isLoading}
        onRefresh={handleManualRefresh}
      />

      {/* 5. AI Moderation & Storage Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIModerationSummaryWidget data={data.moderation} isLoading={isLoading} />
        <StorageSummaryWidget data={data.storage} isLoading={isLoading} />
      </div>

      {/* 6. Time-Series Charts Section */}
      <div>
        <SectionTitle
          title="Platform Growth & Activity Charts"
          description="Visual analytics for uploads, user onboarding, and storage growth velocity."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Daily Photo Uploads"
            subtitle="Uploaded media volume over selected time window"
            seriesData={null} // Gracefully renders EmptyWidget until backend feed connects
            isLoading={isLoading}
            color="amber"
            chartType="area"
          />
          <ChartCard
            title="New User Registration Trend"
            subtitle="Organizers and guests onboarding count"
            seriesData={null} // Gracefully renders EmptyWidget until backend feed connects
            isLoading={isLoading}
            color="emerald"
            chartType="bar"
          />
        </div>
      </div>

      {/* 7. Recent Platform Activity Timeline */}
      <TimelineCard
        activities={data.activity}
        isLoading={isLoading}
        onRefresh={handleManualRefresh}
      />
    </div>
  );
}

export default AdminDashboardPage;
