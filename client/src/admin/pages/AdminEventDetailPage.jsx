import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowLeft,
  Users,
  ImageIcon,
  HardDrive,
  DollarSign,
  Activity,
  Ban,
  Archive,
  Trash2,
  Share2,
  BarChart3,
  ShieldCheck,
  Zap,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import eventDetailsApi from "../services/eventDetailsApi.js";
import eventAnalyticsApi from "../services/eventAnalyticsApi.js";
import eventsAdminApi from "../services/eventsAdminApi.js";
import { formatDate, formatBytes } from "../utils/formatters.js";

export function AdminEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchEventWorkspace = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const [detailRes, analyticsRes, timelineRes] = await Promise.all([
        eventDetailsApi.getEventDetail(id),
        eventAnalyticsApi.getEventAnalytics(id).catch(() => ({ analytics: null })),
        eventDetailsApi.getEventTimeline(id).catch(() => ({ timeline: [] })),
      ]);

      setEventData(detailRes);
      setAnalytics(analyticsRes.analytics);
      setTimeline(timelineRes.timeline || []);
    } catch (err) {
      console.error("[EventDetailPage] Failed to fetch workspace:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEventWorkspace();
  }, [fetchEventWorkspace]);

  const handleDisable = async () => {
    try {
      await eventsAdminApi.disableEvent(id);
      fetchEventWorkspace();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to disable event");
    }
  };

  const handleArchive = async () => {
    try {
      await eventsAdminApi.archiveEvent(id);
      fetchEventWorkspace();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to archive event");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this event and all media uploads?")) return;
    try {
      await eventsAdminApi.deleteEvent(id);
      navigate("/admin/events");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete event");
    }
  };

  if (isLoading) {
    return <SkeletonLoader count={4} height="h-32" className="mt-6" />;
  }

  if (isError || !eventData?.event) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events Queue</span>
        </Link>
        <EmptyState title="Event Not Found" message="The requested event workspace could not be found." />
      </div>
    );
  }

  const { event, stats } = eventData;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/events"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Platform Events Directory</span>
      </Link>

      {/* Header Workspace Banner */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">{event.name}</h2>
              <StatusBadge status={event.status || "active"} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Organizer: {event.organizerName || event.ownerId?.name || "Owner"} ({event.ownerId?.email || "No email"})
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDisable}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Disable</span>
          </button>
          <button
            onClick={handleArchive}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Uploaded Media" value={stats.photosCount} icon={ImageIcon} />
        <StatCard title="Storage Consumed" value={formatBytes(stats.storageBytes)} icon={HardDrive} />
        <StatCard title="Joined Guests" value={analytics?.guestActivity?.joinedGuests || 0} icon={Users} />
        <StatCard title="Storage Quota Usage" value={`${stats.usagePercent}%`} icon={Activity} />
      </div>

      {/* Analytics Charts & Cost Estimations */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Uploads per Hour Bar Chart */}
          <AdminCard title="Uploads per Hour Distribution" subtitle="24-Hour Event Traffic Timeline">
            <div className="space-y-3 pt-2">
              <div className="h-32 flex items-end justify-between gap-1 px-2 border-b border-slate-800 pb-2">
                {analytics.hourlyUploads.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className="w-full bg-amber-500/80 group-hover:bg-amber-400 rounded-t transition-all"
                      style={{ height: `${Math.max(8, (h.uploads / (stats.photosCount || 1)) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>
          </AdminCard>

          {/* Storage & Cloud Infrastructure Financial Metrics */}
          <AdminCard title="Storage Metrics & Cloudflare R2 Costs" subtitle="Binary Storage & Bandwidth Economics">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Original Images Volume</span>
                <span className="font-bold text-white">{formatBytes(analytics.originalBytes)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Thumbnails Storage Volume</span>
                <span className="font-bold text-white">{formatBytes(analytics.thumbnailBytes)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Compression Ratio</span>
                <span className="font-mono text-emerald-400 font-bold">{analytics.compressionRatio}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Cloudflare R2 Monthly Cost (Est.)</span>
                <span className="font-mono text-amber-400 font-bold">{analytics.estimatedMonthlyCost}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">R2 Operations Count (Class 1 / Class 2)</span>
                <span className="font-mono text-slate-300">
                  {analytics.r2Class1Ops} / {analytics.r2Class2Ops}
                </span>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Activity Timeline */}
      <AdminCard title="Event Activity Log & Audit Feed">
        {timeline.length === 0 ? (
          <EmptyState title="No Activity Events" message="No recent activity entries recorded for this event." />
        ) : (
          <div className="space-y-2">
            {timeline.map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <div>
                  <span className="font-bold text-amber-400 uppercase tracking-wider">{log.event}</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">Status: {log.status}</p>
                </div>
                <span className="text-slate-500 font-mono text-[10px]">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default AdminEventDetailPage;
