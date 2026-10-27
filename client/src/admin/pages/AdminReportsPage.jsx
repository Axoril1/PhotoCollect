import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flag,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import reportsApi from "../services/reportsApi.js";
import { reportService } from "../services/report.service.js";
import { formatDate } from "../utils/formatters.js";

export function AdminReportsPage() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await reportsApi.getReports({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
        reason: reasonFilter,
      });

      setReports(response.reports || []);
      setPagination(response.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("[ReportsPage] Failed to fetch report queue:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, priorityFilter, reasonFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAssign = async (reportId) => {
    try {
      await reportsApi.assignModerator(reportId);
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to assign moderator");
    }
  };

  const handleDismiss = async (reportId) => {
    try {
      await reportsApi.dismissReport(reportId, "Dismissed from queue");
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to dismiss report");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Abuse Management Queue"
        description="Review community abuse reports, investigate policy violations, and enforce platform trust."
        badge={`${pagination.total} Open Reports`}
      />

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Reporter, Description, or Target ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
            />
          </div>

          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Reason:</span>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Reasons</option>
              <option value="adult_content">Adult Content</option>
              <option value="violence">Violence</option>
              <option value="harassment">Harassment</option>
              <option value="spam">Spam</option>
              <option value="copyright">Copyright</option>
              <option value="illegal_content">Illegal Content</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Data Table */}
      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-14" />
        ) : isError ? (
          <EmptyState
            icon={Flag}
            title="Failed to Load Reports"
            message="Unable to communicate with trust & safety service."
          />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="Report Queue Clear"
            message="No abuse reports match your current filter parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Report ID</th>
                  <th className="px-4 py-3.5">Target Type</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Reporter</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Submitted</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {reports.map((rep) => (
                  <tr key={rep._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-white">#{rep._id.slice(-6)}</td>

                    <td className="px-4 py-3.5 uppercase font-mono text-[10px] font-bold text-amber-400">
                      {rep.reportType}
                    </td>

                    <td className="px-4 py-3.5 text-slate-200 font-medium">
                      {reportService.formatReason(rep.reason)}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400">{rep.reporterName}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${reportService.getPriorityBadgeColor(
                          rep.priority
                        )}`}
                      >
                        {rep.priority}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={rep.status || "pending"} />
                    </td>

                    <td className="px-4 py-3.5 text-slate-400">{formatDate(rep.createdAt)}</td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/reports/${rep._id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Investigate Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {rep.status === "pending" && (
                          <button
                            onClick={() => handleAssign(rep._id)}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Assign to Me"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(rep._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Dismiss Report"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
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
              reports
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

export default AdminReportsPage;
