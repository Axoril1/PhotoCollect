import { useState, useEffect, useCallback } from "react";
import {
  HardDrive,
  Cloud,
  Database,
  RefreshCw,
  Search,
  Trash2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Server,
  Zap,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatCard from "../components/StatCard.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import storageApi from "../services/storageApi.js";
import { formatBytes, formatDate } from "../utils/formatters.js";

export function AdminStoragePage() {
  const [statsData, setStatsData] = useState(null);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadStorageData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const [statsRes, eventsRes] = await Promise.all([
        storageApi.getStats(),
        storageApi.getEventStorageList({
          page: pagination.page,
          limit: pagination.limit,
          search: debouncedSearch,
        }),
      ]);

      setStatsData(statsRes.stats);
      setEvents(eventsRes.events || []);
      setPagination(eventsRes.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("[StoragePage] Failed to load storage metrics:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch]);

  useEffect(() => {
    loadStorageData();
  }, [loadStorageData]);

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await storageApi.runCleanup();
      alert(res.message);
      loadStorageData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to execute cleanup");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Storage & Cloud Infrastructure"
        description="Monitor cloud storage consumption, Cloudflare R2 / Local providers, event quotas, and cleanup operations."
        action={
          <button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            <Trash2 className={`w-4 h-4 ${isCleaning ? "animate-spin" : ""}`} />
            <span>{isCleaning ? "Purging Files..." : "Run Storage Cleanup"}</span>
          </button>
        }
      />

      {/* Top Metrics Grid */}
      {isLoading ? (
        <SkeletonLoader count={4} height="h-28" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Storage Used"
            value={formatBytes(statsData?.totalBytes || 0)}
            icon={HardDrive}
          />
          <StatCard
            title="Total Uploaded Media"
            value={statsData?.totalPhotos || 0}
            icon={Cloud}
          />
          <StatCard
            title="Average File Size"
            value={formatBytes(statsData?.avgSizeBytes || 0)}
            icon={Database}
          />
          <StatCard
            title="Primary Storage Engine"
            value={(statsData?.activeProvider || "r2").toUpperCase()}
            icon={Server}
          />
        </div>
      )}

      {/* Storage Distribution Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminCard title="Storage Provider Distribution">
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="font-bold text-white block">Cloudflare R2 Object Storage</span>
                  <span className="text-slate-400 text-[11px]">Primary Production Bucket</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-amber-400 block">
                  {formatBytes(statsData?.providers?.r2?.bytes || 0)}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {statsData?.providers?.r2?.count || 0} items
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="font-bold text-white block">Local Storage Fallback</span>
                  <span className="text-slate-400 text-[11px]">Local Filesystem Volume</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-300 block">
                  {formatBytes(statsData?.providers?.local?.bytes || 0)}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {statsData?.providers?.local?.count || 0} items
                </span>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Storage Plan Tier Breakdown">
          <div className="space-y-3 text-xs">
            {statsData?.plans?.map((plan) => (
              <div
                key={plan._id || "free"}
                className="flex items-center justify-between py-2 border-b border-slate-800"
              >
                <span className="font-mono font-bold uppercase text-amber-400">
                  {plan._id || "free"} Plan Tier
                </span>
                <div className="text-right">
                  <span className="font-bold text-white block">
                    {formatBytes(plan.totalStorageBytes || 0)}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {plan.totalEvents || 0} event(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {/* Event Storage Consumption Table */}
      <AdminCard title="Event Storage Consumption Directory">
        <div className="p-3 mb-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Event Name, Slug, or Organizer..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={loadStorageData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading ? (
          <SkeletonLoader count={5} height="h-12" />
        ) : isError ? (
          <EmptyState title="Failed to Load Event Storage" message="Unable to query event storage data." />
        ) : events.length === 0 ? (
          <EmptyState title="No Event Storage Records" message="No events matched your search term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Event Name</th>
                  <th className="px-4 py-3">Organizer</th>
                  <th className="px-4 py-3">Media Count</th>
                  <th className="px-4 py-3">Storage Used</th>
                  <th className="px-4 py-3">Quota Limit</th>
                  <th className="px-4 py-3">Usage %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {events.map((ev) => (
                  <tr key={ev._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white truncate">{ev.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">/{ev.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{ev.organizerName || "Organizer"}</td>
                    <td className="px-4 py-3 font-bold text-amber-400">{ev.photoCount || 0}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">
                      {formatBytes(ev.storageBytes || 0)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {formatBytes(ev.quotaBytes || 5368709120)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              ev.usagePercent > 85 ? "bg-rose-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${ev.usagePercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-300">
                          {ev.usagePercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
              events
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-200">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default AdminStoragePage;
