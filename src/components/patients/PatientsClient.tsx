"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getActiveClinicId } from "@/lib/clinic";

type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  patient_id: string;
  no_show?: boolean | null;
};

const initialForm = {
  name: "",
  email: "",
  phone: "",
  dob: "",
  gender: "Female",
};

export function PatientsClient() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  async function loadPatients() {
    setLoading(true);
    setError(null);
    try {
      const clinicId = getActiveClinicId();
      const [patientsRes, appointmentsRes] = await Promise.all([
        fetch("/api/patients", {
          cache: "no-store",
          headers: { "x-clinic-id": clinicId },
        }),
        fetch("/api/appointments", {
          cache: "no-store",
          headers: { "x-clinic-id": clinicId },
        }),
      ]);

      const patientsPayload = await patientsRes.json();
      const appointmentsPayload = await appointmentsRes.json();

      if (!patientsRes.ok) {
        throw new Error(patientsPayload.error ?? "Failed to fetch patients.");
      }
      if (!appointmentsRes.ok) {
        throw new Error(
          appointmentsPayload.error ?? "Failed to fetch appointments."
        );
      }
      setPatients(patientsPayload.patients ?? []);
      setAppointments(appointmentsPayload.appointments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPatients();
    const reload = () => {
      void loadPatients();
    };
    window.addEventListener("clinic-changed", reload);
    return () => window.removeEventListener("clinic-changed", reload);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const clinicId = getActiveClinicId();
      const res = await fetch("/api/patients", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-clinic-id": clinicId },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(
          payload.error ??
            (editingId ? "Failed to update patient." : "Failed to create patient.")
        );
      }
      setForm(initialForm);
      setEditingId(null);
      await loadPatients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(patient: Patient) {
    setEditingId(patient.id);
    setForm({
      name: patient.name,
      email: patient.email,
      phone: patient.phone ?? "",
      dob: patient.dob ?? "",
      gender: patient.gender ?? "Female",
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this patient?")) return;
    const res = await fetch(`/api/patients?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "Failed to delete patient.");
      return;
    }
    await loadPatients();
  }

  function getNoShowRisk(patientId: string) {
    const missed = appointments.filter(
      (a) => a.patient_id === patientId && a.no_show === true
    );

    if (missed.length >= 2) return "HIGH";
    if (missed.length === 1) return "MEDIUM";
    return "LOW";
  }

  const filteredPatients = patients.filter((patient) => {
    if (!query) return true;
    return [patient.name, patient.email, patient.phone ?? "", patient.gender ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="mx-auto grid max-w-[1380px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create patient</h2>
        <p className="mt-1 text-sm text-slate-500">
          {editingId
            ? "Edit patient details and save changes."
            : "Add a new patient record to Supabase."}
        </p>
        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            type="date"
            value={form.dob}
            onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
          />
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.gender}
            onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
          >
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
          <button
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting
              ? "Saving..."
              : editingId
                ? "Update Patient"
                : "Create Patient"}
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
          <h2 className="text-lg font-semibold text-slate-900">Patient list</h2>
        </div>
        {error ? (
          <p className="px-5 py-4 text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading patients...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">DOB</th>
                  <th className="px-5 py-3">Gender</th>
                  <th className="px-5 py-3">No-show risk</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {patient.name}
                    </td>
                    <td className="px-5 py-4">{patient.email}</td>
                    <td className="px-5 py-4">{patient.phone ?? "-"}</td>
                    <td className="px-5 py-4">{patient.dob ?? "-"}</td>
                    <td className="px-5 py-4">{patient.gender ?? "-"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          getNoShowRisk(patient.id) === "HIGH"
                            ? "bg-red-50 text-red-700"
                            : getNoShowRisk(patient.id) === "MEDIUM"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {getNoShowRisk(patient.id)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(patient)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(patient.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td className="px-5 py-4 text-sm text-slate-500" colSpan={7}>
                      No patients match your search.
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
