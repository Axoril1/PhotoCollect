import { FolderOpen } from "lucide-react";

export function EmptyWidget({
  title = "No data available",
  message = "Metric or feed data will populate here when active.",
  icon: Icon = FolderOpen,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
      <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="font-display text-sm font-bold text-white mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyWidget;
