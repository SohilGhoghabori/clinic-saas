import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PatientsClient } from "@/components/patients/PatientsClient";

export default function PatientsPage() {
  return (
    <DashboardShell title="Patient Directory" subtitle="Create and list patients">
      <PatientsClient />
    </DashboardShell>
  );
}
