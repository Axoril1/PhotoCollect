import { AlertOctagon, RefreshCw } from "lucide-react";

export function AdminServerErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
      <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-6">
        <AlertOctagon className="w-12 h-12" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400 mb-2">
        Error 500 • Internal Error
      </span>

      <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
        Server System Fault
      </h1>

      <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
        An internal server or infrastructure error prevented processing this admin request.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Reload Console</span>
      </button>
    </div>
  );
}

export default AdminServerErrorPage;
