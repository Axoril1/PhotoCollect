import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  RefreshCw,
  Eye,
  Archive,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import eventsAdminApi from "../services/eventsAdminApi.js";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import { formatDate, formatBytes } from "../utils/formatters.js";

export function AdminEventsPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAuth();

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogType, setDialogType] = useState(null); // "disable" | "archive" | "delete"

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await eventsAdminApi.getEvents({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status: statusFilter,
        plan: planFilter,
      });

      setEvents(response.events || []);
      setPagination(response.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("[EventsPage] Failed to fetch events queue:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, planFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleArchive = async (eventId) => {
    try {
      await eventsAdminApi.archiveEvent(eventId);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to archive event");
    }
  };

  const handleDisable = async (eventId) => {
    try {
      await eventsAdminApi.disableEvent(eventId);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to disable event");
    }
  };

  const handleRestore = async (eventId) => {
    try {
      await eventsAdminApi.restoreEvent(eventId);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to restore event");
    }
  };

  const handleDelete = async (eventId) => {
    try {
      await eventsAdminApi.deleteEvent(eventId);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Event Management"
        description="Comprehensive directory of hosted galleries, active events, storage distribution, and event controls."
        badge={`${pagination.total} Total Events`}
      />

      {/* Filter & Search Controls */}
      <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Event Name, Slug, Organizer, or Event ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
            />
          </div>

          <button
            onClick={fetchEvents}
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
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Plan Tier:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="studio">Studio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Data Table */}
      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-14" />
        ) : isError ? (
          <EmptyState
            icon={Calendar}
            title="Failed to Load Events"
            message="Unable to communicate with platform events directory."
          />
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Events Found"
            message="No platform events match your search or filter parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Event Name & Slug</th>
                  <th className="px-4 py-3.5">Organizer</th>
                  <th className="px-4 py-3.5">Plan Tier</th>
                  <th className="px-4 py-3.5">Media Uploads</th>
                  <th className="px-4 py-3.5">Storage Used</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Created Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {events.map((ev) => (
                  <tr key={ev._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white truncate">{ev.name}</span>
                        <span className="text-[11px] text-amber-400 font-mono">/{ev.slug}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300 font-medium">
                      {ev.organizerName || ev.ownerId?.name || "Organizer"}
                    </td>

                    <td className="px-4 py-3.5 font-mono uppercase text-[10px] text-amber-400 font-bold">
                      {ev.planSnapshot || "free"}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-white">{ev.photoCount || 0}</td>

                    <td className="px-4 py-3.5 font-mono text-slate-200">
                      {formatBytes(ev.storageBytes || 0)}
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={ev.status || "active"} />
                    </td>

                    <td className="px-4 py-3.5 text-slate-400">{formatDate(ev.createdAt)}</td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/events/${ev._id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Inspect Event Workspace & Analytics"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {ev.status === "archived" || ev.status === "disabled" ? (
                          <button
                            onClick={() => handleRestore(ev._id)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Restore Event"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedEvent(ev);
                                setDialogType("disable");
                              }}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Disable Event"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(ev);
                                setDialogType("archive");
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="Archive Event"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setSelectedEvent(ev);
                              setDialogType("delete");
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete Event (Super Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(dialogType && selectedEvent)}
        onClose={() => {
          setSelectedEvent(null);
          setDialogType(null);
        }}
        onConfirm={() => {
          if (dialogType === "disable") handleDisable(selectedEvent._id);
          else if (dialogType === "archive") handleArchive(selectedEvent._id);
          else if (dialogType === "delete") handleDelete(selectedEvent._id);
        }}
        title={`${dialogType ? dialogType.toUpperCase() : ""} EVENT`}
        message={`Are you sure you want to ${dialogType} ${selectedEvent?.name}?`}
        confirmText={`Confirm ${dialogType}`}
        type={dialogType === "delete" ? "danger" : "warning"}
      />
    </div>
  );
}

export default AdminEventsPage;
