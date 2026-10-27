import { Activity, RefreshCw, Server, Database, Cloud, Eye, ShieldCheck, Radio, Globe, KeyRound } from "lucide-react";
import HealthIndicator from "./HealthIndicator.jsx";
import SkeletonWidget from "./SkeletonWidget.jsx";
import EmptyWidget from "./EmptyWidget.jsx";
import { SERVICE_STATUS } from "../../types/dashboard.types.js";

const DEFAULT_SERVICES = [
  { name: "Backend Core Server", key: "backend", icon: Server, status: SERVICE_STATUS.HEALTHY },
  { name: "MongoDB Database", key: "database", icon: Database, status: SERVICE_STATUS.HEALTHY },
  { name: "Cloudflare R2 Storage", key: "storage", icon: Cloud, status: SERVICE_STATUS.HEALTHY },
  { name: "Google Cloud Vision API", key: "vision", icon: Eye, status: SERVICE_STATUS.HEALTHY },
  { name: "NSFWJS TensorFlow Engine", key: "nsfwjs", icon: ShieldCheck, status: SERVICE_STATUS.HEALTHY },
  { name: "Socket.IO Realtime Gateway", key: "socket", icon: Radio, status: SERVICE_STATUS.HEALTHY },
  { name: "Public REST API Service", key: "api", icon: Globe, status: SERVICE_STATUS.HEALTHY },
  { name: "Authentication & JWT Subsystem", key: "auth", icon: KeyRound, status: SERVICE_STATUS.HEALTHY },
];

export function StatusCard({
  services = DEFAULT_SERVICES,
  isLoading = false,
  isError = false,
  onRefresh,
}) {
  if (isLoading) {
    return <SkeletonWidget height="h-64" />;
  }

  if (isError) {
    return (
      <EmptyWidget
        title="Status Stream Unavailable"
        message="Unable to communicate with the service health heartbeat monitor."
        action={
          onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          )
        }
      />
    );
  }

  const list = services && services.length > 0 ? services : DEFAULT_SERVICES;

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
            System Infrastructure Status
          </h4>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh Heartbeats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {list.map((srv, idx) => {
          const Icon = srv.icon || Server;
          return (
            <div
              key={srv.key || idx}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-700/50 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-200 truncate">{srv.name}</span>
              </div>
              <HealthIndicator status={srv.status} showLabel size="sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusCard;
