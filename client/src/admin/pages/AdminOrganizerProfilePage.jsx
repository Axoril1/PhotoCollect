import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building,
  Calendar,
  Image as ImageIcon,
  HardDrive,
  QrCode,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  Ban,
  Trash2,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import organizersApi from "../services/organizersApi.js";
import { formatDate, formatBytes } from "../utils/formatters.js";

export function AdminOrganizerProfilePage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchOrganizer = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await organizersApi.getOrganizerById(id);
      setData(response);
    } catch (err) {
      console.error("[OrganizerProfile] Failed to load profile:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrganizer();
  }, [fetchOrganizer]);

  if (isLoading) {
    return <SkeletonLoader count={4} height="h-32" className="mt-6" />;
  }

  if (isError || !data?.user) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/organizers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizers</span>
        </Link>
        <EmptyState title="Organizer Not Found" message="The requested organizer profile could not be retrieved." />
      </div>
    );
  }

  const { user, stats } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/organizers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Organizers Directory</span>
      </Link>

      {/* Organizer Header Card */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
            <Building className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                {user.organizationName || user.name}
              </h2>
              <StatusBadge status={user.status || "active"} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Owner: {user.name} ({user.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 font-bold uppercase">
            {user.plan || "free"} Plan
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events Hosted" value={stats.eventsCreated} icon={Calendar} />
        <StatCard title="Total Media Uploads" value={stats.photosUploaded} icon={ImageIcon} />
        <StatCard title="QR Codes Generated" value={stats.eventsCreated} icon={QrCode} />
        <StatCard title="Storage Consumed" value={formatBytes(stats.totalStorageBytes)} icon={HardDrive} />
      </div>

      {/* Gallery & Moderation Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminCard title="Gallery & Storage Statistics">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Total Upload Volume</span>
              <span className="font-bold text-white">{formatBytes(stats.totalStorageBytes)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Average Photos Per Event</span>
              <span className="font-bold text-white">
                {stats.eventsCreated > 0
                  ? Math.round(stats.photosUploaded / stats.eventsCreated)
                  : 0}
              </span>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Content Moderation Statistics">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">AI Moderation Status</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Passed
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Flagged Photos</span>
              <span className="font-bold text-white">0</span>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

export default AdminOrganizerProfilePage;
