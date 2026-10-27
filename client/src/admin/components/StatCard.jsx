import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, description }) {
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
          {value !== undefined ? value : "—"}
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

export default StatCard;
