import { ShieldAlert, ShieldCheck, Eye, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import HealthIndicator from "./HealthIndicator.jsx";
import SkeletonWidget from "./SkeletonWidget.jsx";
import EmptyWidget from "./EmptyWidget.jsx";
import { SERVICE_STATUS } from "../../types/dashboard.types.js";

export function AIModerationSummaryWidget({ data, isLoading = false, isError = false }) {
  if (isLoading) {
    return <SkeletonWidget height="h-48" />;
  }

  if (isError) {
    return <EmptyWidget title="Moderation Data Unavailable" message="Could not fetch AI moderation statistics." />;
  }

  const mod = data || {
    scannedToday: "—",
    approved: "—",
    pending: "—",
    rejected: "—",
    avgProcessingTimeMs: "—",
    googleVisionStatus: SERVICE_STATUS.HEALTHY,
    nsfwjsStatus: SERVICE_STATUS.HEALTHY,
    falsePositiveRate: "—",
  };

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
            AI Moderation Engine Summary
          </h4>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Dual Engine
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Scanned Today</span>
          <span className="text-xl font-bold text-white mt-1 block">{mod.scannedToday}</span>
        </div>

        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Approved</span>
          </div>
          <span className="text-xl font-bold text-white mt-1 block">{mod.approved}</span>
        </div>

        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-1.5 text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Pending Review</span>
          </div>
          <span className="text-xl font-bold text-white mt-1 block">{mod.pending}</span>
        </div>

        <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
          <div className="flex items-center gap-1.5 text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Rejected</span>
          </div>
          <span className="text-xl font-bold text-white mt-1 block">{mod.rejected}</span>
        </div>
      </div>

      {/* Engine Statuses & Latency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-medium text-slate-300">Google Vision</span>
          </div>
          <HealthIndicator status={mod.googleVisionStatus} size="sm" />
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">NSFWJS Model</span>
          </div>
          <HealthIndicator status={mod.nsfwjsStatus} size="sm" />
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-slate-300">Avg Scan Speed</span>
          </div>
          <span className="text-xs font-bold text-white">{mod.avgProcessingTimeMs}</span>
        </div>
      </div>
    </div>
  );
}

export default AIModerationSummaryWidget;
