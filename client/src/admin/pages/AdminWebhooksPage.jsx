import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Clock,
  Layers,
  Database,
  Activity,
} from "lucide-react";

import webhooksApi from "../services/webhooksApi.js";
import { formatDate } from "../utils/formatters.js";

export function AdminWebhooksPage() {
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState({
    totalProcessed: 0,
    totalFailed: 0,
    totalDuplicates: 0,
    pendingCount: 0,
    avgDurationMs: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [replayingId, setReplayingId] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  const fetchWebhooksData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsRes, metricsRes] = await Promise.all([
        webhooksApi.getWebhooks({
          page: pagination.page,
          status: statusFilter,
          search,
        }),
        webhooksApi.getWebhookMetrics(),
      ]);

      setEvents(eventsRes.events || []);
      setPagination(eventsRes.pagination || { page: 1, totalPages: 1, total: 0 });
      setMetrics(metricsRes.metrics || {});
    } catch (err) {
      console.error("[AdminWebhooksPage] Error fetching webhooks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, statusFilter, search]);

  useEffect(() => {
    fetchWebhooksData();
  }, [fetchWebhooksData]);

  const handleReplay = async (eventId) => {
    setReplayingId(eventId);
    try {
      const res = await webhooksApi.replayWebhook(eventId);
      setAlertMessage({ type: "success", text: res.message || `Event '${eventId}' replayed successfully` });
      await fetchWebhooksData();
    } catch (err) {
      setAlertMessage({ type: "error", text: err.response?.data?.error || `Failed to replay event '${eventId}'` });
    } finally {
      setReplayingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PROCESSED":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">PROCESSED</span>;
      case "FAILED":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full">FAILED</span>;
      case "DUPLICATE_IGNORED":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">DUPLICATE IGNORED</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Webhook className="w-7 h-7 text-amber-500" />
            <span>Stripe Webhooks & Reliability Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Database-backed event processing, failure tracking, idempotency deduplication, and manual replay engine.
          </p>
        </div>

        <button
          onClick={fetchWebhooksData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Dashboard</span>
        </button>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            alertMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
          }`}
        >
          <span>{alertMessage.text}</span>
          <button onClick={() => setAlertMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Processed</span>
          </div>
          <p className="text-2xl font-black text-white font-mono">{metrics.totalProcessed || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Failed</span>
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono">{metrics.totalFailed || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Duplicates</span>
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">{metrics.totalDuplicates || 0}</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Avg Processing</span>
          </div>
          <p className="text-2xl font-black text-blue-400 font-mono">{metrics.avgDurationMs || 0} ms</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Pending</span>
          </div>
          <p className="text-2xl font-black text-indigo-400 font-mono">{metrics.pendingCount || 0}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 border border-slate-800 rounded-2xl text-xs">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search Event ID, Customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-full md:w-72"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Status:</span>
          {["ALL", "PROCESSED", "FAILED", "DUPLICATE_IGNORED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                statusFilter === st ? "bg-amber-500 text-slate-950 shadow" : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-xs shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading persistent webhook logs...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No webhook events match the current criteria.</div>
        ) : (
          <table className="w-full text-left text-slate-300 border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Received At</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Customer ID</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map((evt) => (
                <tr key={evt._id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-amber-400">{evt.eventId}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{evt.eventType}</td>
                  <td className="px-4 py-3">{getStatusBadge(evt.status)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(evt.receivedAt)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{evt.processingDurationMs ? `${evt.processingDurationMs}ms` : "-"}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{evt.stripeCustomerId || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleReplay(evt.eventId)}
                      disabled={replayingId === evt.eventId}
                      className="px-3 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 text-slate-200 font-bold rounded-lg transition-all flex items-center gap-1 ml-auto disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3 h-3 ${replayingId === evt.eventId ? "animate-spin" : ""}`} />
                      <span>Replay</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminWebhooksPage;
