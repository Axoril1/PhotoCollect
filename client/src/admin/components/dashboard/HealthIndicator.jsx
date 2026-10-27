import { SERVICE_STATUS } from "../../types/dashboard.types.js";

export function HealthIndicator({ status = SERVICE_STATUS.UNKNOWN, showLabel = true, size = "md" }) {
  const normalized = String(status).toLowerCase();

  const config = {
    [SERVICE_STATUS.HEALTHY]: {
      color: "bg-emerald-500",
      pingColor: "bg-emerald-400",
      text: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      label: "Healthy",
    },
    [SERVICE_STATUS.WARNING]: {
      color: "bg-amber-500",
      pingColor: "bg-amber-400",
      text: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      label: "Warning",
    },
    [SERVICE_STATUS.OFFLINE]: {
      color: "bg-rose-500",
      pingColor: "bg-rose-400",
      text: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      label: "Offline",
    },
    [SERVICE_STATUS.UNKNOWN]: {
      color: "bg-slate-500",
      pingColor: "bg-slate-400",
      text: "text-slate-400",
      bg: "bg-slate-800 border-slate-700",
      label: "Unknown",
    },
  }[normalized] || {
    color: "bg-slate-500",
    pingColor: "bg-slate-400",
    text: "text-slate-400",
    bg: "bg-slate-800 border-slate-700",
    label: "Unknown",
  };

  const dotSize = size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2";

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className="relative flex">
        {normalized === SERVICE_STATUS.HEALTHY && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pingColor} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${config.color}`} />
      </span>
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

export default HealthIndicator;
