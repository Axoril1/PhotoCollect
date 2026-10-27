import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";

export function AdminForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
      <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-6 animate-pulse">
        <ShieldX className="w-12 h-12" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400 mb-2">
        Error 403 • Forbidden
      </span>

      <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
        Access Restricted
      </h1>

      <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
        You do not have administrative credentials to access the QR Snap Platform Management Console.
        This section is reserved for verified platform Administrators and Super Admins.
      </p>

      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to App</span>
        </Link>
      </div>
    </div>
  );
}

export default AdminForbiddenPage;
