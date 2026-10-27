import { FolderOpen } from "lucide-react";

export function EmptyState({
  title = "No data found",
  message = "There are no records matching your request at this time.",
  icon: Icon = FolderOpen,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="font-display text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
