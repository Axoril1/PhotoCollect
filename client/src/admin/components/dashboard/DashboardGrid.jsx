export function DashboardGrid({ children, cols = 4, className = "" }) {
  const colMap = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  const gridClass = colMap[cols] || colMap[4];

  return <div className={`grid ${gridClass} gap-4 md:gap-5 ${className}`}>{children}</div>;
}

export default DashboardGrid;
