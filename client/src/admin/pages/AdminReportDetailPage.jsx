import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Flag,
  ArrowLeft,
  CheckCircle,
  XCircle,
  ShieldAlert,
  User,
  Calendar,
  AlertTriangle,
  UserX,
  FileText,
  Clock,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import reportsApi from "../services/reportsApi.js";
import { reportService } from "../services/report.service.js";
import { formatDate } from "../utils/formatters.js";

export function AdminReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const fetchReportDetail = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await reportsApi.getReportDetail(reportId);
      setData(response);
    } catch (err) {
      console.error("[ReportDetail] Failed to load report:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReportDetail();
  }, [fetchReportDetail]);

  const handleResolve = async (actionTaken) => {
    try {
      await reportsApi.resolveReport(reportId, {
        actionTaken,
        resolutionReason: resolutionNotes || `Report resolved via ${actionTaken}`,
      });
      fetchReportDetail();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to resolve report");
    }
  };

  const handleDismiss = async () => {
    try {
      await reportsApi.dismissReport(reportId, resolutionNotes || "Dismissed as invalid");
      fetchReportDetail();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to dismiss report");
    }
  };

  if (isLoading) {
    return <SkeletonLoader count={4} height="h-32" className="mt-6" />;
  }

  if (isError || !data?.report) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Report Queue</span>
        </Link>
        <EmptyState title="Report Not Found" message="The requested report could not be found." />
      </div>
    );
  }

  const { report, targetPreview } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Reports Queue</span>
      </Link>

      <PageHeader
        title={`Investigate Report #${report._id.slice(-6)}`}
        description={`Reported for ${reportService.formatReason(report.reason)}`}
        badge={<StatusBadge status={report.status || "pending"} />}
      />

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Target Preview & Risk Score (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Preview */}
          <AdminCard title="Reported Target Content Preview">
            {targetPreview ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                {report.reportType === "photo" && (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={targetPreview.thumbnailUrl || targetPreview.originalUrl}
                      alt="Reported content"
                      className="w-32 h-32 object-cover rounded-xl border border-slate-800 shadow"
                    />
                    <div className="space-y-1 text-xs">
                      <span className="font-mono text-slate-400">Photo ID: {targetPreview._id}</span>
                      <p className="text-white font-bold">{targetPreview.originalName}</p>
                      <p className="text-slate-400">Uploaded by: {targetPreview.uploaderName}</p>
                    </div>
                  </div>
                )}

                {report.reportType === "event" && (
                  <div className="space-y-1 text-xs">
                    <span className="font-mono text-amber-400 font-bold">Event: {targetPreview.name}</span>
                    <p className="text-slate-300">Slug: /{targetPreview.slug}</p>
                    <p className="text-slate-400">Organizer: {targetPreview.organizerName}</p>
                  </div>
                )}

                {(report.reportType === "user" || report.reportType === "organizer") && (
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-white text-sm">{targetPreview.name}</span>
                    <p className="text-slate-400">{targetPreview.email}</p>
                    <p className="font-mono text-amber-400">Role: {targetPreview.role}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Target content preview unavailable or deleted.</p>
            )}
          </AdminCard>

          {/* Repeat Offender & Risk Evaluation */}
          <AdminCard title="Repeat Offender & Risk Assessment">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">System Offender Risk Score</span>
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {report.riskScore || 50} / 100
                </span>
              </div>
              <div className="w-32 h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${report.riskScore || 50}%` }}
                />
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Resolution Controls (1 col) */}
        <div className="space-y-6">
          <AdminCard title="Resolution Controls">
            <div className="space-y-3 text-xs">
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Resolution reason / notes..."
                rows={3}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleResolve("content_approved")}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition-all"
                >
                  Approve Content (Valid Upload)
                </button>

                <button
                  onClick={() => handleResolve("content_deleted")}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow transition-all"
                >
                  Delete Reported Content
                </button>

                <button
                  onClick={() => handleResolve("user_suspended")}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl transition-all"
                >
                  Suspend User / Organizer
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 font-semibold rounded-xl transition-all border border-slate-800"
                >
                  Dismiss Report
                </button>
              </div>
            </div>
          </AdminCard>

          {/* Activity Log */}
          <AdminCard title="Report Timeline Feed">
            <div className="space-y-2">
              {report.timeline?.map((t, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex justify-between font-bold text-amber-400">
                    <span>{t.action}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{formatDate(t.timestamp)}</span>
                  </div>
                  <p className="text-slate-300 mt-0.5">{t.notes}</p>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

export default AdminReportDetailPage;
