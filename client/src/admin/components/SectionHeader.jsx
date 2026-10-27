export function SectionHeader({ title, description, actions }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">
          {title}
        </h4>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default SectionHeader;
