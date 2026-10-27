import { Loader2 } from "lucide-react";

export function LoadingOverlay({ isVisible = false, message = "Loading..." }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex flex-col items-center p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs font-semibold text-slate-200 tracking-wide">{message}</span>
      </div>
    </div>
  );
}

export default LoadingOverlay;
