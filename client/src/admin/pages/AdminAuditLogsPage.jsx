import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import DataTable from "../components/DataTable.jsx";
import FilterBar from "../components/FilterBar.jsx";
import SearchInput from "../components/SearchInput.jsx";
import { ClipboardList } from "lucide-react";

export function AdminAuditLogsPage() {
  const columns = [
    { header: "Timestamp", accessor: "createdAt" },
    { header: "Admin / User", accessor: "userId" },
    { header: "Event", accessor: "event" },
    { header: "Status", accessor: "status" },
    { header: "IP Address", accessor: "ip" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Audit Logs"
        description="Immutable record of administrative actions, authentication attempts, and policy changes."
        badge="Audit Stream"
      />

      <FilterBar>
        <SearchInput placeholder="Filter audit logs by event or user..." onChange={() => {}} />
      </FilterBar>

      <AdminCard>
        <DataTable
          columns={columns}
          data={[]}
          emptyTitle="Audit Log Stream Ready"
          emptyMessage="Security audit logs and administrator activity entries will stream to this data view."
        />
      </AdminCard>
    </div>
  );
}

export default AdminAuditLogsPage;
