import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { UserManagementClient } from "@/components/user-management/UserManagementClient";

export default function UserManagementPage() {
  return (
    <DashboardShell title="User Management" subtitle="Clinic Staff">
      <UserManagementClient />
    </DashboardShell>
  );
}
