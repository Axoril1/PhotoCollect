import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { Activity } from "lucide-react";

export function AdminSystemHealthPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health & Status"
        description="Monitor MongoDB connections, Redis caches, Resend email queues, and socket connections."
        badge="Super Admin"
      />

      <AdminCard title="Infrastructure Monitoring">
        <EmptyState
          icon={Activity}
          title="Health Monitor Ready"
          message="Live service heartbeat checks and connection latency indicators will display here."
        />
      </AdminCard>
    </div>
  );
}

export default AdminSystemHealthPage;
