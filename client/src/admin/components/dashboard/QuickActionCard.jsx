import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  ShieldAlert,
  Users,
  Calendar,
  HardDrive,
  Settings,
  ClipboardList,
  ChevronRight,
} from "lucide-react";

export function QuickActionCard() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "View Moderation Queue",
      description: "Review flagged uploads & AI decisions",
      icon: ShieldAlert,
      path: "/admin/moderation",
      color: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    },
    {
      label: "Manage User Accounts",
      description: "Governance, RBAC & suspensions",
      icon: Users,
      path: "/admin/users",
      color: "from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20",
    },
    {
      label: "Inspect Platform Events",
      description: "Directory, limits & closing",
      icon: Calendar,
      path: "/admin/events",
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Open Storage Metrics",
      description: "Cloudflare R2 usage & quotas",
      icon: HardDrive,
      path: "/admin/storage",
      color: "from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20",
    },
    {
      label: "System Settings",
      description: "Global limits & infrastructure config",
      icon: Settings,
      path: "/admin/settings",
      color: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20",
    },
    {
      label: "Security Audit Logs",
      description: "Immutable admin action feed",
      icon: ClipboardList,
      path: "/admin/audit",
      color: "from-slate-700/50 to-slate-800/50 text-slate-300 border-slate-700",
    },
  ];

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">
          Quick Console Actions
        </h4>
        <span className="text-xs text-slate-400">Shortcuts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className={`flex items-center justify-between p-3.5 rounded-xl border bg-gradient-to-r ${action.color} hover:opacity-90 transition-all text-left group`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/10 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block group-hover:text-amber-400 transition-colors">
                    {action.label}
                  </span>
                  <span className="text-[11px] text-slate-400 block leading-snug">
                    {action.description}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActionCard;
