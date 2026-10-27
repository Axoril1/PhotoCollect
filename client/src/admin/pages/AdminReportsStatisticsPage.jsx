import { useState, useEffect, useCallback } from "react";
import { BarChart3, Flag, CheckCircle, Clock, ShieldAlert } from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatCard from "../components/StatCard.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import reportsApi from "../services/reportsApi.js";
import { reportService } from "../services/report.service.js";

export function AdminReportsStatisticsPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await reportsApi.getStatistics();
      setStats(response.statistics);
    } catch (err) {
      console.error("[ReportsStatistics] Failed to fetch statistics:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Abuse & Trust Metrics Dashboard"
        description="Platform trust metrics, report volume trends, and common violation categories."
      />

      {isLoading || !stats ? (
        <SkeletonLoader count={4} height="h-28" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Reports Today" value={stats.reportsToday || 0} icon={Flag} />
            <StatCard title="Pending Review" value={stats.pendingCount || 0} icon={ShieldAlert} />
            <StatCard title="Total Resolved" value={stats.resolvedCount || 0} icon={CheckCircle} />
            <StatCard title="Avg Resolution Time" value={stats.avgResolutionTime || "45m"} icon={Clock} />
          </div>

          <AdminCard title="Most Common Violation Categories">
            <div className="space-y-3 text-xs">
              {stats.reasonBreakdown?.map((item) => (
                <div key={item._id} className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-300 font-semibold">
                    {reportService.formatReason(item._id)}
                  </span>
                  <span className="font-mono font-bold text-amber-400">{item.count} Reports</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}

export default AdminReportsStatisticsPage;
