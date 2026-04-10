"use client";

import { FormEvent, useEffect, useState } from "react";
import { getActiveClinicId } from "@/lib/clinic";

type SettingsForm = {
  clinic_name: string;
  primary_email: string;
  clinic_address: string;
  monday_open: string;
  monday_close: string;
  tuesday_open: string;
  tuesday_close: string;
  sunday_closed: boolean;
  slot_duration_minutes: number;
  buffer_time_minutes: number;
  high_risk_threshold: number;
  automated_risk_reminders: boolean;
  auto_fill_rescheduling: boolean;
};

const defaultForm: SettingsForm = {
  clinic_name: "Sanctuary Health Center",
  primary_email: "admin@sanctuaryhealth.com",
  clinic_address: "742 Medical District Dr, Suite 100, San Francisco, CA",
  monday_open: "08:00 AM",
  monday_close: "06:00 PM",
  tuesday_open: "08:00 AM",
  tuesday_close: "06:00 PM",
  sunday_closed: true,
  slot_duration_minutes: 30,
  buffer_time_minutes: 10,
  high_risk_threshold: 70,
  automated_risk_reminders: true,
  auto_fill_rescheduling: false,
};

export function SettingsClient() {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        cache: "no-store",
        headers: { "x-clinic-id": getActiveClinicId() },
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to load settings.");
      }
      if (payload.settings) {
        setForm({
          ...defaultForm,
          ...payload.settings,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    const reload = () => {
      void loadSettings();
    };
    window.addEventListener("clinic-changed", reload);
    return () => window.removeEventListener("clinic-changed", reload);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-id": getActiveClinicId(),
        },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to save settings.");
      }
      setForm({ ...defaultForm, ...payload.settings });
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto grid max-w-[1220px] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"
    >
      <aside className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        {["General", "Operations", "Appointments", "AI & Predictions"].map(
          (item, i) => (
            <button
              key={item}
              type="button"
              className={`mb-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium ${
                i === 0
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          )
        )}
      </aside>

      <section className="space-y-5">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setForm(defaultForm)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Reset
          </button>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Loading settings...
          </p>
        ) : null}

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">
            General Information
          </h3>
          <p className="text-sm text-slate-500">
            Core identity and contact details for the clinic.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Clinic Name
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                value={form.clinic_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, clinic_name: e.target.value }))
                }
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Primary Email
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                value={form.primary_email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, primary_email: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Clinic Address
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
              value={form.clinic_address}
              onChange={(e) =>
                setForm((p) => ({ ...p, clinic_address: e.target.value }))
              }
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Operations</h3>
          <p className="text-sm text-slate-500">
            Standard business hours for patient reception.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="grid grid-cols-[50px_1fr_1fr_50px] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs font-semibold text-slate-500">MON</span>
              <input
                className="rounded border border-slate-200 bg-white px-2 py-1"
                value={form.monday_open}
                onChange={(e) =>
                  setForm((p) => ({ ...p, monday_open: e.target.value }))
                }
              />
              <input
                className="rounded border border-slate-200 bg-white px-2 py-1"
                value={form.monday_close}
                onChange={(e) =>
                  setForm((p) => ({ ...p, monday_close: e.target.value }))
                }
              />
              <span className="ml-auto h-5 w-9 rounded-full bg-emerald-500" />
            </div>
            <div className="grid grid-cols-[50px_1fr_1fr_50px] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs font-semibold text-slate-500">TUE</span>
              <input
                className="rounded border border-slate-200 bg-white px-2 py-1"
                value={form.tuesday_open}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tuesday_open: e.target.value }))
                }
              />
              <input
                className="rounded border border-slate-200 bg-white px-2 py-1"
                value={form.tuesday_close}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tuesday_close: e.target.value }))
                }
              />
              <span className="ml-auto h-5 w-9 rounded-full bg-emerald-500" />
            </div>
            <div className="grid grid-cols-[50px_1fr_1fr_50px] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs font-semibold text-slate-500">SUN</span>
              <span className="text-slate-500">Closed for sanctuary rest</span>
              <span />
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, sunday_closed: !p.sunday_closed }))
                }
                className={`ml-auto h-5 w-9 rounded-full ${
                  form.sunday_closed ? "bg-slate-300" : "bg-emerald-500"
                }`}
                aria-label="Toggle Sunday closed"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">
            Appointment Logic
          </h3>
          <p className="text-sm text-slate-500">
            Define temporal parameters and patient commitments.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Default Slot Duration (mins)
              <input
                type="number"
                min={5}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                value={form.slot_duration_minutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    slot_duration_minutes: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Buffer Time (mins)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                value={form.buffer_time_minutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    buffer_time_minutes: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-blue-600 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900">
              Intelligence & Predictions
            </h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Real-time
            </span>
          </div>
          <p className="text-sm text-blue-700">Active AI Monitoring Enabled</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${Math.min(form.high_risk_threshold, 100)}%` }}
            />
          </div>
          <label className="mt-2 block text-sm text-slate-600">
            High-Risk Probability Threshold
            <input
              type="range"
              min={0}
              max={100}
              className="mt-2 w-full"
              value={form.high_risk_threshold}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  high_risk_threshold: Number(e.target.value),
                }))
              }
            />
            <span className="font-semibold text-slate-900">
              {form.high_risk_threshold}%
            </span>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  automated_risk_reminders: !p.automated_risk_reminders,
                }))
              }
              className="rounded-lg border border-slate-200 p-3 text-left"
            >
              Automated Risk Reminders
              <span
                className={`float-right inline-block h-5 w-9 rounded-full ${
                  form.automated_risk_reminders ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  auto_fill_rescheduling: !p.auto_fill_rescheduling,
                }))
              }
              className="rounded-lg border border-slate-200 p-3 text-left"
            >
              Auto-Fill Rescheduling
              <span
                className={`float-right inline-block h-5 w-9 rounded-full ${
                  form.auto_fill_rescheduling ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
