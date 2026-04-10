import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <DashboardShell title="Clinic Settings" subtitle="Configure your sanctuary's operational DNA and intelligence parameters.">
      <SettingsClient />
    </DashboardShell>
  );
}
