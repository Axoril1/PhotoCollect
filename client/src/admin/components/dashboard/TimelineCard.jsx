import {
  UserPlus,
  Calendar,
  Upload,
  ShieldX,
  CheckCircle,
  HardDrive,
  RefreshCw,
  Clock,
} from "lucide-react";
import SkeletonWidget from "./SkeletonWidget.jsx";
import EmptyWidget from "./EmptyWidget.jsx";
import { ACTIVITY_TYPES } from "../../types/dashboard.types.js";

const ICON_MAP = {
  [ACTIVITY_TYPES.USER_REGISTERED]: UserPlus,
  [ACTIVITY_TYPES.EVENT_CREATED]: Calendar,
  [ACTIVITY_TYPES.IMAGE_UPLOADED]: Upload,
  [ACTIVITY_TYPES.IMAGE_REJECTED]: ShieldX,
  [ACTIVITY_TYPES.ADMIN_APPROVED]: CheckCircle,
  [ACTIVITY_TYPES.STORAGE_INCREASED]: HardDrive,
  [ACTIVITY_TYPES.SYSTEM_RESTARTED]: RefreshCw,
};

export function TimelineCard({ activities = [], isLoading = false, isError = false, onRefresh }) {
  if (isLoading) {
    return <SkeletonWidget height="h-64" />;
  }

  if (isError) {
    return <EmptyWidget title="Activity Stream Error" message="Failed to load real-time event activity feed." />;
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
            Recent Platform Activity
          </h4>
        </div>
        <EmptyWidget
          icon={Clock}
          title="No Recent Activity"
          message="Platform events and audit triggers will display in real time here."
        />
      </div>
    );
  }

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
            Recent Platform Activity
          </h4>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {activities.map((item, idx) => {
          const Icon = ICON_MAP[item.type] || Clock;
          return (
            <div key={item.id || idx} className="relative flex items-start gap-3 group">
              <div className="absolute -left-6 top-1 p-1 rounded-full bg-slate-900 border border-slate-700 text-amber-400 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{item.timestamp}</span>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{item.description}</p>
                )}
                {item.user && (
                  <span className="text-[10px] font-mono text-amber-400/90 mt-1 block">
                    By: {item.user}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TimelineCard;
