import { ShieldCheck, Activity } from "lucide-react";

export function AdminFooter() {
  return (
    <footer className="mt-auto px-6 py-4 bg-[#111827] border-t border-slate-800/80 text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-500" />
        <span className="font-semibold text-slate-300">QR Snap Admin Engine</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">v4.0.0-sprint4</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Activity className="w-3.5 h-3.5" />
          <span>All Services Operational</span>
        </div>
        <span className="text-slate-600">|</span>
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="hover:text-amber-400 transition-colors"
        >
          Documentation
        </a>
      </div>
    </footer>
  );
}

export default AdminFooter;
