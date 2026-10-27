import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAdmin } from "../context/useAdmin.js";

export function AdminBreadcrumb() {
  const { breadcrumbs } = useAdmin();

  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <div key={crumb.path + idx} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-amber-400/90 truncate">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-slate-200 transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default AdminBreadcrumb;
