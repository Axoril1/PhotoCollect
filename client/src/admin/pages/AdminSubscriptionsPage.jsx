import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Search,
  RefreshCw,
  Edit,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { formatDate } from "../utils/formatters.js";
import subscriptionApi from "../../services/subscriptionApi.js";
import axios from "axios";

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  const fetchAdminSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await axios.get("/api/admin/subscriptions-center/subscriptions", {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter,
          planSlug: planFilter,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      setSubscriptions(response.data.subscriptions || []);
      setPagination(response.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("[AdminSubscriptions] Error fetching subscriptions:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, planFilter]);

  useEffect(() => {
    fetchAdminSubscriptions();
  }, [fetchAdminSubscriptions]);

  const handleAdminChangePlan = async (subId, newSlug) => {
    try {
      await axios.patch(
        `/api/admin/subscriptions-center/subscriptions/${subId}`,
        { planSlug: newSlug },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      fetchAdminSubscriptions();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to modify subscription");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions & Revenue Management"
        description="Monitor user plans, extend trials, grant upgrades, and manage platform subscription lifecycle."
        badge={`${pagination.total} Subscriptions`}
      />

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="PAST_DUE">PAST_DUE</option>
            <option value="CANCELED">CANCELED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Plans</option>
            <option value="free">FREE</option>
            <option value="pro">PRO</option>
            <option value="business">BUSINESS</option>
          </select>
        </div>

        <button
          onClick={fetchAdminSubscriptions}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Subscriptions Table */}
      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-12" />
        ) : isError ? (
          <EmptyState title="Failed to Load Subscriptions" message="Unable to fetch platform subscriptions." />
        ) : subscriptions.length === 0 ? (
          <EmptyState title="No Subscriptions Found" message="No user subscriptions match the selected criteria." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Subscriber User</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3 text-right">Quick Plan Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {subscriptions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{s.owner?.name || "User"}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{s.owner?.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400 uppercase">
                      {s.planSlug}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 uppercase font-mono text-[10px] text-slate-400">
                      {s.provider}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAdminChangePlan(s._id, "free")}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-[10px]"
                        >
                          Set Free
                        </button>
                        <button
                          onClick={() => handleAdminChangePlan(s._id, "pro")}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded font-semibold text-[10px]"
                        >
                          Set Pro
                        </button>
                        <button
                          onClick={() => handleAdminChangePlan(s._id, "business")}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded font-semibold text-[10px]"
                        >
                          Set Business
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default AdminSubscriptionsPage;
