export function FilterBar({ children, onClear }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 flex-1">{children}</div>
      {onClear && (
        <button
          onClick={onClear}
          className="text-xs text-amber-400/90 hover:text-amber-300 font-semibold transition-colors"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}

export default FilterBar;
