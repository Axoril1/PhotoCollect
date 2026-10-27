import { useState, useEffect, useCallback } from "react";
import { History, Shield, RefreshCw } from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import moderationApi from "../services/moderationApi.js";
import { formatDate } from "../utils/formatters.js";

export function AdminModerationHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await moderationApi.getHistory();
      setHistory(response.history || []);
    } catch (err) {
      console.error("[ModerationHistory] Failed to load audit trail:", err);
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
        title="Moderation Audit Trail & History"
        description="Immutable log of all administrator and automated AI moderation decisions."
        badge={`${history.length} Events Recorded`}
      />

      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={5} height="h-12" />
        ) : isError ? (
          <EmptyState
            icon={History}
            title="Failed to Load History"
            message="Unable to fetch moderation audit logs."
          />
        ) : history.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Moderation Logs"
            message="No moderation audit events have been recorded yet."
          />
        ) : (
          <div className="space-y-3">
            {history.map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <div>
                  <span className="font-bold text-amber-400 uppercase tracking-wider">
                    {log.event}
                  </span>
                  <p className="text-slate-300 mt-0.5">
                    Admin: {log.userId?.name || "System AI"} • Target: #{log.details?.photoId || "Bulk"}
                  </p>
                </div>
                <span className="text-slate-500 font-mono text-[10px]">
                  {formatDate(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default AdminModerationHistoryPage;
