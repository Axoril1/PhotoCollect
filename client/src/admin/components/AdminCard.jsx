export function AdminCard({ children, className = "", title, subtitle, actions }) {
  return (
    <div
      className={`bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl p-5 backdrop-blur-sm transition-all hover:border-slate-700/80 ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div>
            {title && <h3 className="font-display text-base font-bold text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default AdminCard;
