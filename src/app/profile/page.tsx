"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { getActiveClinicId } from "@/lib/clinic";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [staffUserId, setStaffUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Admin");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");

      const res = await fetch("/api/users", {
        headers: { "x-clinic-id": getActiveClinicId() },
      });
      const payload = await res.json();
      const users = (payload.users ?? []) as Array<{
        id: string;
        auth_user_id?: string | null;
        email: string;
        full_name?: string;
        role?: string;
      }>;
      const linked = users.find(
        (u) =>
          u.auth_user_id === user.id || u.email === user.email
      );

      if (linked) {
        setError(null);
        setStaffUserId(linked.id);
        setFullName(linked.full_name ?? "");
        setRole(linked.role ?? "Admin");
      } else {
        setStaffUserId(null);
        setFullName("");
        setRole("Admin");
        setError(
          "No linked staff user found for this login. Ask admin to create user with login access."
        );
      }
    }
    void load();
    const reload = () => {
      void load();
    };
    window.addEventListener("clinic-changed", reload);
    return () => window.removeEventListener("clinic-changed", reload);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!staffUserId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-clinic-id": getActiveClinicId(),
      },
      body: JSON.stringify({
        id: staffUserId,
        full_name: fullName,
        role,
      }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "Failed to update profile.");
      setSaving(false);
      return;
    }
    window.dispatchEvent(new Event("profile-updated"));
    setMessage("Profile updated.");
    setSaving(false);
  }

  return (
    <DashboardShell title="Profile" subtitle="View and edit your profile">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500"
            value={email}
            disabled
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>Admin</option>
            <option>Doctor</option>
            <option>Receptionist</option>
            <option>Nurse</option>
          </select>
          <button
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving || !staffUserId || !userId}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
