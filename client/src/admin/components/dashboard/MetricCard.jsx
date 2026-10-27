import { TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from "lucide-react";
import SkeletonWidget from "./SkeletonWidget.jsx";
import EmptyWidget from "./EmptyWidget.jsx";

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  description,
  icon: Icon,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
}) {
  if (isLoading) {
    return <SkeletonWidget height="h-36" />;
  }

  if (isError) {
    return (
      <div className="p-5 bg-slate-900/90 border border-rose-500/20 rounded-2xl shadow-xl flex flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center justify-between text-rose-400">
          <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="my-3">
          <span className="text-xs font-medium text-rose-300">Failed to load metric</span>
          {error && <p className="text-[10px] text-slate-400 truncate mt-0.5">{error.message || String(error)}</p>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  const isEmpty = value === undefined || value === null;

  const getTrendIcon = () => {
    if (changeType === "increase") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (changeType === "decrease") return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  };

  const getTrendClass = () => {
    if (changeType === "increase") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (changeType === "decrease") return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    return "text-slate-400 bg-slate-800 border-slate-700";
  };

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col justify-between backdrop-blur-sm transition-all hover:border-slate-700">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
          {isEmpty ? "—" : value}
        </div>
        {change && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getTrendClass()}`}
            >
              {getTrendIcon()}
              <span>{change}</span>
            </span>
            {description && <span className="text-xs text-slate-400">{description}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
