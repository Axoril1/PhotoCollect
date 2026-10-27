export function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
