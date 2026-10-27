import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Lock,
  Activity,
  Key,
  ShieldAlert,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
} from "lucide-react";

import adminsApi from "../services/adminsApi.js";
import { formatDate } from "../utils/formatters.js";

const ALL_ROLES = [
  "ALL",
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "ADMIN",
  "MODERATOR",
  "SUPPORT",
  "READ_ONLY_ADMIN",
];

export function AdminManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [adminActivity, setAdminActivity] = useState([]);
  const [alertMessage, setAlertMessage] = useState(null);

  // New Admin Form State
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
  });

  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminsApi.getAdmins({
        page: pagination.page,
        limit: pagination.limit,
        role: roleFilter,
        search,
      });
      setAdmins(res.admins || []);
      setPagination(res.pagination || { page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      console.error("[AdminManagementPage] Error fetching admins:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, roleFilter, search]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await adminsApi.createAdmin(newAdmin);
      setAlertMessage({ type: "success", text: `Admin ${newAdmin.email} created successfully!` });
      setShowCreateModal(false);
      setNewAdmin({ name: "", email: "", password: "", role: "ADMIN" });
      await fetchAdmins();
    } catch (err) {
      setAlertMessage({ type: "error", text: err.response?.data?.error || "Failed to create admin." });
    }
  };

  const handleRoleChange = async (adminId, newRole) => {
    try {
      await adminsApi.updateRole(adminId, newRole);
      setAlertMessage({ type: "success", text: "Admin role updated successfully." });
      await fetchAdmins();
    } catch (err) {
      setAlertMessage({ type: "error", text: err.response?.data?.error || "Failed to update role." });
    }
  };

  const handleStatusToggle = async (adminId, currentStatus) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await adminsApi.updateStatus(adminId, nextStatus);
      setAlertMessage({ type: "success", text: `Admin status updated to ${nextStatus}.` });
      await fetchAdmins();
    } catch (err) {
      setAlertMessage({ type: "error", text: err.response?.data?.error || "Failed to update status." });
    }
  };

  const handleDeleteAdmin = async (adminId, adminEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete admin ${adminEmail}?`)) return;
    try {
      await adminsApi.deleteAdmin(adminId);
      setAlertMessage({ type: "success", text: `Admin ${adminEmail} deleted successfully.` });
      await fetchAdmins();
    } catch (err) {
      setAlertMessage({ type: "error", text: err.response?.data?.error || "Failed to delete admin." });
    }
  };

  const handleViewActivity = async (admin) => {
    setSelectedAdmin(admin);
    setShowActivityDrawer(true);
    try {
      const res = await adminsApi.getActivity(admin._id);
      setAdminActivity(res.logs || []);
    } catch (err) {
      console.error("[AdminManagementPage] Error fetching activity:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-amber-500" />
            <span>Administrator Management & IAM</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Super Admin bootstrap management, role hierarchy assignments, RBAC permissions, and session revocation.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New Admin</span>
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

      {/* Search & Role Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 p-4 border border-slate-800 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search admins by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r === "ALL" ? "All Roles" : r}
              </option>
            ))}
          </select>

          <button
            onClick={fetchAdmins}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-xs shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading administrators...</div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No admin accounts found.</div>
        ) : (
          <table className="w-full text-left text-slate-300 border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {admins.map((a) => (
                <tr key={a._id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{a.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.role}
                      onChange={(e) => handleRoleChange(a._id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-amber-400 font-bold focus:outline-none"
                    >
                      {ALL_ROLES.filter((r) => r !== "ALL").map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        a.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleViewActivity(a)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="View Activity Logs"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleStatusToggle(a._id, a.status)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        a.status === "ACTIVE"
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                      }`}
                      title={a.status === "ACTIVE" ? "Suspend Admin" : "Reactivate Admin"}
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAdmin(a._id, a.email)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                      title="Delete Admin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <span>Create New Administrator</span>
            </h3>

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Password</label>
                <input
                  type="password"
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Admin Role</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold text-amber-400"
                >
                  {ALL_ROLES.filter((r) => r !== "ALL").map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition-all"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Drawer */}
      {showActivityDrawer && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 p-6 space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Activity Audit Logs</h3>
                <p className="text-xs text-slate-400">{selectedAdmin.name} ({selectedAdmin.email})</p>
              </div>
              <button onClick={() => setShowActivityDrawer(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {adminActivity.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No activity logs recorded for this admin.</div>
              ) : (
                adminActivity.map((log) => (
                  <div key={log._id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex justify-between font-bold text-amber-400">
                      <span>{log.action}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">{log.resource}</div>
                    {log.ip && <div className="text-[10px] text-slate-500">IP: {log.ip}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManagementPage;
