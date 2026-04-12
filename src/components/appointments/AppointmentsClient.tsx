"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getActiveClinicId } from "@/lib/clinic";

type PatientOption = {
  id: string;
  name: string;
};

type Appointment = {
  id: string;
  patient_id: string;
  patient_name: string | null;
  doctor_name: string;
  appointment_type: string;
  appointment_at: string;
  notes: string | null;
  status: string;
  no_show?: boolean | null;
};

const initialForm = {
  patient_id: "",
  doctor_name: "",
  appointment_type: "Follow-up",
  appointment_at: "",
  notes: "",
};

export function AppointmentsClient() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  const canSubmit = useMemo(
    () =>
      !!form.patient_id &&
      !!form.doctor_name &&
      !!form.appointment_type &&
      !!form.appointment_at,
    [form]
  );

  async function fetchPatients() {
    const clinicId = getActiveClinicId();
    const res = await fetch("/api/patients", {
      cache: "no-store",
      headers: { "x-clinic-id": clinicId },
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error ?? "Failed to fetch patients.");
    }
    setPatients(
      (payload.patients ?? []).map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
      }))
    );
  }

  async function fetchAppointments() {
    const clinicId = getActiveClinicId();
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("appointment_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      setError(error.message);
    } else {
      setAppointments((data as Appointment[]) || []);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchPatients(), fetchAppointments()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadAll() {
      await fetchPatients();
      await fetchAppointments();
    }
  
    function reload() {
      loadAll();
    }
  
    loadAll();
  
    window.addEventListener("clinic-changed", reload);
  
    return () => {
      window.removeEventListener("clinic-changed", reload);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const appointmentAt = new Date(form.appointment_at).toISOString();
      const res = await fetch("/api/appointments", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-id": getActiveClinicId(),
        },
        body: JSON.stringify(
          editingId
            ? { id: editingId, ...form, appointment_at: appointmentAt }
            : { ...form, appointment_at: appointmentAt }
        ),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to create appointment.");
      }

      setForm(initialForm);
      setEditingId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function markNoShow(id: string) {
    setError(null);
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ no_show: true })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadAll();
  }

  function handleEdit(appointment: Appointment) {
    setEditingId(appointment.id);
    setForm({
      patient_id: appointment.patient_id,
      doctor_name: appointment.doctor_name,
      appointment_type: appointment.appointment_type,
      appointment_at: toDatetimeLocal(appointment.appointment_at),
      notes: appointment.notes ?? "",
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this appointment?")) return;
    const res = await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "Failed to delete appointment.");
      return;
    }
    await loadAll();
  }

  function getNoShowRisk(patientId: string) {
    const missed = appointments.filter(
      (a) => a.patient_id === patientId && a.no_show === true
    );

    if (missed.length >= 2) return "HIGH";
    if (missed.length === 1) return "MEDIUM";
    return "LOW";
  }

  const filteredAppointments = appointments.filter((appointment) => {
    if (!query) return true;
    return [
      appointment.patient_name ?? "",
      appointment.doctor_name,
      appointment.appointment_type,
      appointment.status,
      appointment.notes ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="mx-auto grid max-w-[1380px] gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {editingId ? "Edit appointment" : "Create appointment"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {editingId
            ? "Update appointment details and save."
            : "Book a patient visit from live Supabase data."}
        </p>
        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.patient_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, patient_id: e.target.value }))
            }
            required
          >
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Doctor name"
            value={form.doctor_name}
            onChange={(e) =>
              setForm((p) => ({ ...p, doctor_name: e.target.value }))
            }
            required
          />
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.appointment_type}
            onChange={(e) =>
              setForm((p) => ({ ...p, appointment_type: e.target.value }))
            }
            required
          >
            <option>Follow-up</option>
            <option>Consultation</option>
            <option>Checkup</option>
            <option>Emergency</option>
          </select>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            type="datetime-local"
            value={form.appointment_at}
            onChange={(e) =>
              setForm((p) => ({ ...p, appointment_at: e.target.value }))
            }
            required
          />
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <button
            disabled={!canSubmit || submitting}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting
              ? "Saving..."
              : editingId
                ? "Update Appointment"
                : "Create Appointment"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
              }}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel Edit
            </button>
          ) : null}
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Appointment list
          </h2>
        </div>
        {error ? (
          <p className="px-5 py-4 text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">
            Loading appointments...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Date & time</th>
                  <th className="px-5 py-3">Risk</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {appointment.patient_name ?? appointment.patient_id}
                    </td>
                    <td className="px-5 py-4">{appointment.doctor_name}</td>
                    <td className="px-5 py-4">{appointment.appointment_type}</td>
                    <td className="px-5 py-4">
                      {new Date(appointment.appointment_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          getNoShowRisk(appointment.patient_id) === "HIGH"
                            ? "bg-red-50 text-red-700"
                            : getNoShowRisk(appointment.patient_id) === "MEDIUM"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {getNoShowRisk(appointment.patient_id)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => markNoShow(appointment.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          disabled={appointment.no_show === true}
                        >
                          {appointment.no_show ? "Marked" : "Mark No Show"}
                        </button>
                        <button
                          onClick={() => handleEdit(appointment)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(appointment.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td className="px-5 py-4 text-sm text-slate-500" colSpan={7}>
                      No appointments match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
