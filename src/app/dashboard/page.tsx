"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck2,
  CalendarX2,
  Clock3,
  TrendingUp,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { getActiveClinicId } from "@/lib/clinic";

type Appointment = {
  id: string;
  no_show?: boolean | null;
};

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchData();
    const reload = () => {
      void fetchData();
    };
    window.addEventListener("clinic-changed", reload);
    return () => window.removeEventListener("clinic-changed", reload);
  }, []);

  async function fetchData() {
    setLoading(true);
    const clinicId = getActiveClinicId();
    const [{ data: appointmentsData }, { count: patientCount }] =
      await Promise.all([
        supabase.from("appointments").select("*").eq("clinic_id", clinicId),
        supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId),
      ]);

    setAppointments((appointmentsData as Appointment[]) || []);
    setTotalPatients(patientCount ?? 0);
    setLoading(false);
  }

  const total = appointments.length;
  const missed = appointments.filter((a) => a.no_show).length;
  const attended = total - missed;
  const missRate = total > 0 ? Math.round((missed / total) * 100) : 0;
  const trendText =
    missRate <= 10
      ? "Healthy attendance trend"
      : missRate <= 25
        ? "Monitor no-show trend"
        : "High no-show trend";

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Operational overview and attendance insights"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
            Clinic Performance
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Appointment Intelligence
          </h2>
          <p className="mt-1 text-sm text-blue-100">
            Real-time summary of total, attended, and missed appointments.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Total Appointments"
            value={total}
            icon={<CalendarCheck2 className="h-5 w-5 text-blue-600" />}
            tone="blue"
          />
          <MetricCard
            title="Total Patients"
            value={totalPatients}
            icon={<Users className="h-5 w-5 text-indigo-600" />}
            tone="indigo"
          />
          <MetricCard
            title="Attended"
            value={attended}
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            tone="emerald"
          />
          <MetricCard
            title="Missed Appointments"
            value={missed}
            icon={<CalendarX2 className="h-5 w-5 text-rose-600" />}
            tone="rose"
          />
          <MetricCard
            title="No-show Rate"
            value={`${missRate}%`}
            icon={<Clock3 className="h-5 w-5 text-amber-600" />}
            tone="amber"
          />
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            Attendance Insight
          </h3>
          <p className="mt-1 text-sm text-slate-500">{trendText}</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${
                missRate > 25
                  ? "bg-rose-500"
                  : missRate > 10
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(missRate, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Based on appointments currently available in Supabase.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading metrics...</p>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "blue" | "indigo" | "emerald" | "rose" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50"
      : tone === "indigo"
        ? "bg-indigo-50"
      : tone === "emerald"
        ? "bg-emerald-50"
        : tone === "rose"
          ? "bg-rose-50"
          : "bg-amber-50";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-xl p-2.5 ${toneClass}`}>{icon}</div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

