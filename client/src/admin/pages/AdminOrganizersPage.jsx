import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import organizersApi from "../services/organizersApi.js";
import { formatDate } from "../utils/formatters.js";

export function AdminOrganizersPage() {
  const navigate = useNavigate();

  const [organizers, setOrganizers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchOrganizers = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await organizersApi.getOrganizers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status: statusFilter,
        plan: planFilter,
      });

      setOrganizers(response.organizers || []);
      setPagination(response.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("[OrganizersPage] Failed to load organizers:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, planFilter]);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizer Command Center"
        description="Manage event organizers, organization details, event quotas, and gallery stats."
        badge={`${pagination.total} Organizers`}
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
              placeholder="Search by Organization Name, Organizer, or Email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
            />
          </div>

          <button
            onClick={fetchOrganizers}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
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
              <option value="suspended">Suspended</option>
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

      {/* Data Table */}
      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-12" />
        ) : isError ? (
          <EmptyState
            icon={Building}
            title="Failed to Load Organizers"
            message="Unable to communicate with organizers directory."
          />
        ) : organizers.length === 0 ? (
          <EmptyState
            icon={Building}
            title="No Organizers Found"
            message="No event organizers match your filter parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Organization / Organizer</th>
                  <th className="px-4 py-3.5">Plan Tier</th>
                  <th className="px-4 py-3.5">Total Events</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Joined Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {organizers.map((org) => {
                  const isSusp = org.isSuspended || org.status === "suspended";
                  return (
                    <tr key={org._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold shrink-0">
                            <Building className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white truncate">
                              {org.organizationName || org.name}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {org.name} • {org.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono uppercase text-[10px] text-amber-400">
                        {org.plan || "free"}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{org.eventsCount || 0} Events</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={isSusp ? "suspended" : org.status || "active"} />
                      </td>

                      <td className="px-4 py-3.5 text-slate-400">{formatDate(org.createdAt)}</td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => navigate(`/admin/organizers/${org._id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View Organizer Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
              organizers
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

export default AdminOrganizersPage;
