import EmptyState from "./EmptyState.jsx";
import SkeletonLoader from "./SkeletonLoader.jsx";

export function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = "No records found",
  emptyMessage = "No items available to display.",
  renderRow,
}) {
  if (isLoading) {
    return <SkeletonLoader count={5} height="h-12" className="mt-4" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="w-full overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/90 shadow-xl">
      <table className="w-full text-left text-xs text-slate-300 border-collapse">
        <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className="px-4 py-3.5">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {data.map((item, index) => (
            <tr
              key={item.id || item._id || index}
              className="hover:bg-slate-800/40 transition-colors"
            >
              {renderRow
                ? renderRow(item, index)
                : columns.map((col, idx) => (
                    <td key={col.key || idx} className="px-4 py-3.5 font-medium">
                      {col.accessor ? item[col.accessor] : "—"}
                    </td>
                  ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
