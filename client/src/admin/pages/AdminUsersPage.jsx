import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Shield,
  UserX,
  UserCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  XCircle,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import usersApi from "../services/usersApi.js";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import { formatDate } from "../utils/formatters.js";

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAuth();

  // Data & Pagination State
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  // Selected User Modal Actions
  const [actionTarget, setActionTarget] = useState(null);
  const [dialogType, setDialogType] = useState(null); // "suspend" | "delete" | "reactivate"

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load server-side users list
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await usersApi.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        plan: planFilter,
      });

      setUsers(response.users || []);
      setPagination(response.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("[UsersPage] Failed to fetch server users:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, roleFilter, statusFilter, planFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Action Handlers
  const handleStatusChange = async (targetUser, newStatus) => {
    try {
      await usersApi.updateStatus(targetUser._id, newStatus);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  };

  const handleDeleteUser = async (targetUser) => {
    try {
      await usersApi.deleteUser(targetUser._id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Account Management"
        description="Comprehensive server-side directory of platform accounts, roles, and status governance."
        badge={`${pagination.total} Accounts`}
      />

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Server-Side Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Email, Phone, or User ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
            />
          </div>

          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Select Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="ORGANIZER">Organizer</option>
              <option value="GUEST">Guest</option>
            </select>
          </div>

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
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
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

      {/* High-Performance Server-Side Data Table */}
      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-12" />
        ) : isError ? (
          <EmptyState
            icon={Users}
            title="Failed to Load Users"
            message="Server request failed. Please check network connectivity."
            action={
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Try Again
              </button>
            }
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            message="No user records match your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Verified</th>
                  <th className="px-4 py-3.5">Joined Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => {
                  const isSusp = u.isSuspended || u.status === "suspended" || u.status === "banned";
                  return (
                    <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & Email */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-700">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-white truncate">{u.name}</span>
                            <span className="text-[11px] text-slate-400 truncate">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 text-[10px]">
                          {u.role}
                        </span>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5 uppercase font-mono text-[10px] text-slate-300">
                        {u.plan || "free"}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={isSusp ? "suspended" : u.status || "active"} />
                      </td>

                      {/* Email Verified */}
                      <td className="px-4 py-3.5">
                        {u.isVerified || u.emailVerified ? (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-500">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>No</span>
                          </div>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3.5 text-slate-400">{formatDate(u.createdAt)}</td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/users/${u._id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isSusp ? (
                            <button
                              onClick={() => handleStatusChange(u, "active")}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              title="Reactivate User"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActionTarget(u);
                                setDialogType("suspend");
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Suspend Account"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          {isSuperAdmin && u.role !== "SUPER_ADMIN" && (
                            <button
                              onClick={() => {
                                setActionTarget(u);
                                setDialogType("delete");
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Permanent Delete (Super Admin)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
              users
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

      {/* Confirmation Dialog Modal */}
      <ConfirmationDialog
        isOpen={Boolean(dialogType && actionTarget)}
        onClose={() => {
          setActionTarget(null);
          setDialogType(null);
        }}
        onConfirm={() => {
          if (dialogType === "suspend") {
            handleStatusChange(actionTarget, "suspended");
          } else if (dialogType === "delete") {
            handleDeleteUser(actionTarget);
          }
        }}
        title={dialogType === "delete" ? "Permanently Delete User" : "Suspend User Account"}
        message={
          dialogType === "delete"
            ? `Are you sure you want to permanently delete ${actionTarget?.email}? This action cannot be undone.`
            : `Are you sure you want to suspend ${actionTarget?.email}? All active access tokens will be revoked.`
        }
        confirmText={dialogType === "delete" ? "Delete Account" : "Suspend Account"}
        type="danger"
      />
    </div>
  );
}

export default AdminUsersPage;
