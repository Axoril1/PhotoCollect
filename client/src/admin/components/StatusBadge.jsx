import { getStatusTheme } from "../utils/formatters.js";

export function StatusBadge({ status, label }) {
  const theme = getStatusTheme(status);

  const styleMap = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    slate: "bg-slate-800 text-slate-300 border-slate-700",
  };

  const currentStyle = styleMap[theme] || styleMap.slate;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wider ${currentStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span>{label || status}</span>
    </span>
  );
}

export default StatusBadge;
