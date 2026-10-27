import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  QrCode,
  Download,
  Upload,
  Users,
  HardDrive,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import analyticsApi from "../services/analyticsApi.js";
import { formatBytes } from "../admin/utils/formatters.js";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

export function OrganizerAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [eventsStats, setEventsStats] = useState([]);
  const [qrStats, setQrStats] = useState(null);
  const [uploadStats, setUploadStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ovRes, evRes, qrRes, upRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getEvents(),
        analyticsApi.getQR(),
        analyticsApi.getUploads(),
      ]);

      setOverview(ovRes);
      setEventsStats(evRes.events || []);
      setQrStats(qrRes);
      setUploadStats(upRes.uploadsPerDay || []);
    } catch (err) {
      console.error("[OrganizerAnalyticsPage] Error loading analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCSV = () => {
    const token = localStorage.getItem("accessToken");
    window.open(`${analyticsApi.exportCSVUrl}?token=${token}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-32 bg-slate-900 animate-pulse rounded-2xl" />
        <div className="h-64 bg-slate-900 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const deviceData = (qrStats?.deviceBreakdown || []).map((d) => ({ name: d._id || "Unknown", value: d.count }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-amber-500" />
            <span>Organizer Analytics & Business Intelligence</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Real-time engagement metrics, QR scan demographics, upload velocity, and cloud storage consumption.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Events</span>
          <p className="text-2xl font-black text-white font-mono">{overview?.totalEvents || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">QR Scans</span>
          <p className="text-2xl font-black text-amber-400 font-mono">{overview?.qrScans || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Photos Uploaded</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{overview?.imagesUploaded || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Downloads</span>
          <p className="text-2xl font-black text-blue-400 font-mono">{overview?.downloads || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Guests Joined</span>
          <p className="text-2xl font-black text-indigo-400 font-mono">{overview?.guestsJoined || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Storage Used</span>
          <p className="text-xl font-black text-amber-400 font-mono">{formatBytes(overview?.storageUsedBytes || 0)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Velocity Line Chart (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Upload Velocity & Daily Photo Activity</span>
          </h3>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={uploadStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="_id" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown Pie Chart (1 col) */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-amber-500" />
            <span>QR Scan Device Distribution</span>
          </h3>

          <div className="h-64 w-full flex items-center justify-center">
            {deviceData.length === 0 ? (
              <div className="text-xs text-slate-500">No QR scan demographics recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Event Performance Breakdown Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>Event Performance Breakdown</span>
        </h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-xs shadow-xl">
          {eventsStats.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No active event statistics found.</div>
          ) : (
            <table className="w-full text-left text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Event Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Photos</th>
                  <th className="px-4 py-3">Storage</th>
                  <th className="px-4 py-3">QR Scans</th>
                  <th className="px-4 py-3">Gallery Views</th>
                  <th className="px-4 py-3">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {eventsStats.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-white">{e.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        e.isClosed ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}>
                        {e.isClosed ? "Archived" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400">{e.photoCount}</td>
                    <td className="px-4 py-3 font-mono text-amber-400">{formatBytes(e.storageBytes)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{e.qrScans}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{e.views}</td>
                    <td className="px-4 py-3 font-mono text-blue-400">{e.downloads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganizerAnalyticsPage;
