import { Link } from "react-router-dom";
import { FileQuestion, ArrowLeft } from "lucide-react";

export function AdminNotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
      <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6">
        <FileQuestion className="w-12 h-12" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-2">
        Error 404 • Not Found
      </span>

      <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
        Admin Page Not Found
      </h1>

      <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
        The platform admin module or page route you are trying to reach does not exist or has been relocated.
      </p>

      <Link
        to="/admin/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Admin Dashboard</span>
      </Link>
    </div>
  );
}

export default AdminNotFoundPage;
