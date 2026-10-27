export function SkeletonWidget({ height = "h-32", className = "" }) {
  return (
    <div
      className={`w-full ${height} bg-slate-900/80 border border-slate-800 rounded-2xl animate-pulse p-4 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="w-24 h-4 bg-slate-800 rounded-md" />
        <div className="w-8 h-8 bg-slate-800 rounded-xl" />
      </div>
      <div className="space-y-2 mt-4">
        <div className="w-32 h-8 bg-slate-800 rounded-lg" />
        <div className="w-20 h-3 bg-slate-800 rounded-md" />
      </div>
    </div>
  );
}

export default SkeletonWidget;
