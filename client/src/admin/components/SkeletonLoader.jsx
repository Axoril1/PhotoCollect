export function SkeletonLoader({ count = 3, height = "h-20", className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-full ${height} bg-slate-800/60 rounded-2xl animate-pulse border border-slate-700/30`}
        />
      ))}
    </div>
  );
}

export default SkeletonLoader;
