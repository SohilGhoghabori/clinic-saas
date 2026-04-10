import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AppointmentsClient } from "@/components/appointments/AppointmentsClient";

export default function AppointmentsPage() {
  return (
    <DashboardShell title="Appointments" subtitle="Create and list appointments">
      <AppointmentsClient />
    </DashboardShell>
  );
  
  
}