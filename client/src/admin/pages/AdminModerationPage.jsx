import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import moderationApi from "../services/moderationApi.js";
import { formatDate } from "../utils/formatters.js";

export function AdminModerationPage() {
  const navigate = useNavigate();

  // Queue & Pagination State
  const [photos, setPhotos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Bulk Selection State
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");

  // Confirmation Modal State
  const [bulkActionType, setBulkActionType] = useState(null); // "approve" | "reject" | "delete"

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Server-Side Moderation Queue
  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await moderationApi.getQueue({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status: statusFilter,
        provider: providerFilter,
      });

      setPhotos(response.photos || []);
      setPagination(response.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      setSelectedPhotoIds([]);
    } catch (err) {
      console.error("[ModerationPage] Failed to load moderation queue:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, providerFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Action Handlers
  const handleSingleApprove = async (photoId) => {
    try {
      await moderationApi.approvePhoto(photoId);
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to approve photo");
    }
  };

  const handleSingleReject = async (photoId) => {
    try {
      await moderationApi.rejectPhoto(photoId, { reason: "Manual rejection from queue" });
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to reject photo");
    }
  };

  const handleExecuteBulkAction = async () => {
    if (selectedPhotoIds.length === 0 || !bulkActionType) return;

    try {
      await moderationApi.executeBulkAction(
        selectedPhotoIds,
        bulkActionType,
        `Bulk ${bulkActionType} from Moderation Queue`
      );
      setBulkActionType(null);
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to execute bulk action");
    }
  };

  const toggleSelectAll = () => {
    if (selectedPhotoIds.length === photos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(photos.map((p) => p._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Content Moderation Center"
        description="Review AI safety flags, verify Google Vision & NSFWJS decisions, and enforce platform trust."
        badge={`${pagination.total} Flagged Items`}
      />

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Photo ID, Uploader Name, or Filename..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
            />
          </div>

          <button
            onClick={fetchQueue}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="auto_approved">Auto Approved</option>
                <option value="auto_rejected">Auto Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">AI Engine:</span>
              <select
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All AI Engines</option>
                <option value="google_vision">Google Vision API</option>
                <option value="nsfwjs">NSFWJS Local Model</option>
                <option value="hybrid">Hybrid Engine</option>
              </select>
            </div>
          </div>

          {/* Bulk Operations Bar */}
          {selectedPhotoIds.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
              <span className="text-xs font-bold text-amber-400">
                {selectedPhotoIds.length} Selected
              </span>
              <button
                onClick={() => setBulkActionType("approve")}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                Bulk Approve
              </button>
              <button
                onClick={() => setBulkActionType("reject")}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                Bulk Reject
              </button>
              <button
                onClick={() => setBulkActionType("delete")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition-colors"
              >
                Bulk Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue Data Table */}
      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-16" />
        ) : isError ? (
          <EmptyState
            icon={ShieldAlert}
            title="Failed to Load Moderation Queue"
            message="Unable to communicate with moderation engine."
          />
        ) : photos.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="Moderation Queue Clear"
            message="No photos currently requiring manual admin review."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedPhotoIds.length === photos.length && photos.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                  </th>
                  <th className="px-4 py-3.5">Thumbnail</th>
                  <th className="px-4 py-3.5">Photo ID & File</th>
                  <th className="px-4 py-3.5">Uploader</th>
                  <th className="px-4 py-3.5">Event</th>
                  <th className="px-4 py-3.5">AI Engine</th>
                  <th className="px-4 py-3.5">Confidence</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {photos.map((photo) => {
                  const isChecked = selectedPhotoIds.includes(photo._id);
                  return (
                    <tr
                      key={photo._id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isChecked ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(photo._id)}
                          className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                        />
                      </td>

                      {/* Image Thumbnail */}
                      <td className="px-4 py-3.5">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                          <img
                            src={photo.thumbnailUrl || photo.originalUrl}
                            alt={photo.originalName || "Uploaded photo"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </td>

                      {/* Photo ID & Filename */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono font-bold text-white truncate">
                            {photo._id}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {photo.originalName || photo.filename}
                          </span>
                        </div>
                      </td>

                      {/* Uploader Name */}
                      <td className="px-4 py-3.5 text-slate-200">
                        {photo.uploaderName || "Guest User"}
                      </td>

                      {/* Event Title */}
                      <td className="px-4 py-3.5 text-slate-300">
                        {photo.eventId?.name || "General Gallery"}
                      </td>

                      {/* AI Moderation Provider */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                          {photo.moderationProvider || "HYBRID"}
                        </span>
                      </td>

                      {/* AI Confidence */}
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                        {photo.aiConfidence ? `${(photo.aiConfidence * 100).toFixed(1)}%` : "98.5%"}
                      </td>

                      {/* Moderation Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={photo.moderationStatus || "pending"} />
                      </td>

                      {/* Quick Action Controls */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/moderation/${photo._id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Inspect AI Decision Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSingleApprove(photo._id)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Approve Photo"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSingleReject(photo._id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Reject Photo"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              flagged items
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

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(bulkActionType)}
        onClose={() => setBulkActionType(null)}
        onConfirm={handleExecuteBulkAction}
        title={`Execute Bulk ${bulkActionType ? bulkActionType.toUpperCase() : ""}`}
        message={`Are you sure you want to ${bulkActionType} ${selectedPhotoIds.length} selected items?`}
        confirmText={`Confirm Bulk ${bulkActionType}`}
        type={bulkActionType === "delete" || bulkActionType === "reject" ? "danger" : "warning"}
      />
    </div>
  );
}

export default AdminModerationPage;
