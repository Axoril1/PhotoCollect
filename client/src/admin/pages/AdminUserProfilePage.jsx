import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Clock,
  Calendar,
  HardDrive,
  Activity,
  KeyRound,
  UserX,
  UserCheck,
  Trash2,
  Lock,
  MessageSquare,
  Plus,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import usersApi from "../services/usersApi.js";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import { formatDate, formatBytes } from "../utils/formatters.js";

export function AdminUserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin, currentAdmin } = useAdminAuth();

  const [userData, setUserData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "activity" | "notes"

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const [profileRes, notesRes] = await Promise.all([
        usersApi.getUserById(id),
        usersApi.getNotes(id).catch(() => ({ notes: [] })),
      ]);

      setUserData(profileRes);
      setNotes(notesRes.notes || []);
    } catch (err) {
      console.error("[UserProfile] Failed to load user details:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleStatusToggle = async () => {
    if (!userData?.user) return;
    const isSusp = userData.user.isSuspended || userData.user.status === "suspended";
    const newStatus = isSusp ? "active" : "suspended";

    try {
      await usersApi.updateStatus(id, newStatus);
      fetchUserProfile();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  };

  const handleRoleChange = async (newRole) => {
    try {
      await usersApi.updateUser(id, { role: newRole });
      fetchUserProfile();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update role");
    }
  };

  const handleTerminateSessions = async () => {
    try {
      await usersApi.terminateSessions(id);
      alert("All active sessions terminated");
      fetchUserProfile();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to terminate sessions");
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      const res = await usersApi.addNote(id, newNoteContent);
      setNotes((prev) => [res.note, ...prev]);
      setNewNoteContent("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add internal note");
    }
  };

  if (isLoading) {
    return <SkeletonLoader count={4} height="h-32" className="mt-6" />;
  }

  if (isError || !userData?.user) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users List</span>
        </Link>
        <EmptyState
          icon={UserX}
          title="User Profile Not Found"
          message="The requested user account does not exist or has been permanently removed."
        />
      </div>
    );
  }

  const { user, stats, recentActivity } = userData;
  const isSuspended = user.isSuspended || user.status === "suspended";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumbs Link & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users Directory</span>
        </Link>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isSuspended ? (
            <button
              onClick={handleStatusToggle}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>Reactivate Account</span>
            </button>
          ) : (
            <button
              onClick={handleStatusToggle}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              <UserX className="w-4 h-4" />
              <span>Suspend Account</span>
            </button>
          )}

          <button
            onClick={handleTerminateSessions}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Revoke Sessions</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Banner */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold text-2xl flex items-center justify-center shadow-lg shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">{user.name}</h2>
              <StatusBadge status={isSuspended ? "suspended" : user.status || "active"} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                ROLE: {user.role}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                PLAN: {user.plan || "free"}
              </span>
            </div>
          </div>
        </div>

        {/* Role Select Dropdown for Admins */}
        <div className="flex flex-col gap-1 text-right">
          <span className="text-xs font-semibold text-slate-400">Change Assigned Role</span>
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={user.role === "SUPER_ADMIN" && !isSuperAdmin}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          >
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="ORGANIZER">ORGANIZER</option>
            <option value="GUEST">GUEST</option>
          </select>
        </div>
      </div>

      {/* Profile Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Events Created" value={stats.eventsCreated} icon={Calendar} />
        <StatCard title="Photos Uploaded" value={stats.photosUploaded} icon={User} />
        <StatCard title="Active Sessions" value={stats.activeSessions} icon={Lock} />
        <StatCard title="Total Storage Used" value={formatBytes(stats.totalStorageBytes)} icon={HardDrive} />
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800/80">
        {[
          { id: "overview", label: "Account Overview" },
          { id: "activity", label: `Activity Feed (${recentActivity.length})` },
          { id: "notes", label: `Admin Notes (${notes.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === tab.id
                ? "text-amber-400 border-amber-500"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Account Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminCard title="Account Profile Information">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">User ID</span>
                <span className="font-mono text-slate-200">{user._id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Organization</span>
                <span className="text-slate-200">{user.organizationName || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Phone Number</span>
                <span className="text-slate-200">{user.phone || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Email Verified</span>
                <span>{user.isVerified || user.emailVerified ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Authentication Provider</span>
                <span className="uppercase text-slate-200 font-mono">{user.provider || "email"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Joined Date</span>
                <span className="text-slate-200">{formatDate(user.createdAt)}</span>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Security Governance & Tokens">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Permissions Version</span>
                <span className="font-mono font-bold text-amber-400">{user.permissionsVersion || 1}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Failed Login Counter</span>
                <span className="text-slate-200">{user.failedLoginAttempts || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Lockout Status</span>
                <span className="text-slate-200">
                  {user.lockoutUntil && new Date(user.lockoutUntil) > new Date()
                    ? `Locked until ${formatDate(user.lockoutUntil)}`
                    : "None"}
                </span>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Tab 2: Activity Feed */}
      {activeTab === "activity" && (
        <AdminCard title="Recent Activity Audit Feed">
          {recentActivity.length === 0 ? (
            <EmptyState title="No Activity Logs" message="No recent activity entries recorded for this user." />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-bold text-white uppercase tracking-wider">{log.event}</span>
                    <span className="text-slate-400 block text-[11px] mt-0.5">
                      Status: {log.status} • IP: {log.ip || "—"}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[10px]">{formatDate(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* Tab 3: Admin Internal Notes */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <AdminCard title="Internal Admin Notes" subtitle="Visible only to platform administrators">
            <form onSubmit={handleAddNote} className="space-y-3 mb-6">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write an internal administrator note..."
                rows={3}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Note</span>
                </button>
              </div>
            </form>

            {notes.length === 0 ? (
              <EmptyState title="No Admin Notes" message="No internal administrator notes recorded for this user." />
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n._id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">{n.adminName}</span>
                      <span className="text-slate-500 text-[10px]">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      )}
    </div>
  );
}

export default AdminUserProfilePage;
