import { useState, useEffect, useCallback } from "react";
import { History, Flag } from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import reportsApi from "../services/reportsApi.js";
import { formatDate } from "../utils/formatters.js";

export function AdminReportsHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await reportsApi.getHistory();
      setHistory(response.history || []);
    } catch (err) {
      console.error("[ReportsHistory] Failed to load history:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports Resolution History"
        description="Immutable audit trail of all resolved and dismissed abuse reports."
        badge={`${history.length} Resolved Entries`}
      />

      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-12" />
        ) : isError ? (
          <EmptyState title="Failed to Load History" message="Unable to fetch report resolution logs." />
        ) : history.length === 0 ? (
          <EmptyState title="No History Records" message="No resolved or dismissed report records found." />
        ) : (
          <div className="space-y-3">
            {history.map((rep) => (
              <div
                key={rep._id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <div>
                  <span className="font-bold text-amber-400 uppercase tracking-wider">
                    Report #{rep._id.slice(-6)} • {rep.reason}
                  </span>
                  <p className="text-slate-300 mt-0.5">
                    Resolution: {rep.resolutionReason || "Completed"}
                  </p>
                </div>
                <span className="text-slate-500 font-mono text-[10px]">
                  {formatDate(rep.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default AdminReportsHistoryPage;
