import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { TrendingUp } from "lucide-react";

export function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Analytics"
        description="Growth velocity, upload activity trends, and conversion analytics."
      />

      <AdminCard title="Growth Trends">
        <EmptyState
          icon={TrendingUp}
          title="Analytics Visualizer Ready"
          message="Platform growth charts and event conversion trends will plug into this component container."
        />
      </AdminCard>
    </div>
  );
}

export default AdminAnalyticsPage;
