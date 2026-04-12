"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { getActiveClinicId } from "@/lib/clinic";

type StaffUser = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  last_login_at: string | null;
};

const initialForm = {
  full_name: "",
  email: "",
  password: "",
  role: "Doctor",
  department: "",
  status: "Active",
};

export function UserManagementClient() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  async function fetchUsers() {
    const res = await fetch("/api/users", {
      cache: "no-store",
      headers: { "x-clinic-id": getActiveClinicId() },
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error ?? "Failed to fetch users.");
    }
    setUsers(payload.users ?? []);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  
    const reload = () => loadAll();
  
    window.addEventListener("clinic-changed", reload);
  
    return () => window.removeEventListener("clinic-changed", reload);
  }, [loadAll]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-id": getActiveClinicId(),
        },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to create user.");
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

  function handleEdit(user: StaffUser) {
    setEditingId(user.id);
    setForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this user?")) return;
    const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "Failed to delete user.");
      return;
    }
    await loadAll();
  }

  const totalUsers = users.length;
  const activeDoctors = useMemo(
    () => users.filter((u) => u.role === "Doctor" && u.status === "Active").length,
    [users]
  );
  const staffOnline = useMemo(
    () => users.filter((u) => u.status === "Active").length,
    [users]
  );
  const filteredUsers = users.filter((u) => {
    if (!query) return true;
    return [u.full_name, u.email, u.role, u.department, u.status]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Total Users", String(totalUsers), "Live count"],
          ["Active Doctors", String(activeDoctors), "From current roster"],
          ["Staff Online", String(staffOnline), "Active status users"],
        ].map(([label, value, meta], i) => (
          <div
            key={String(label)}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              i === 2 ? "border-emerald-200" : "border-slate-200/80"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-4xl font-bold tracking-tight text-slate-900">
                {value}
              </p>
              <span className="text-xs text-slate-500">{meta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add new user</h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingId
              ? "Update staff user details."
              : "Create clinic staff and optionally enable login."}
          </p>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, full_name: e.target.value }))
              }
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
            {!editingId ? (
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                type="password"
                placeholder="Temporary password (optional for login)"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            ) : null}
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option>Doctor</option>
              <option>Admin</option>
              <option>Receptionist</option>
              <option>Nurse</option>
            </select>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Department"
              value={form.department}
              onChange={(e) =>
                setForm((p) => ({ ...p, department: e.target.value }))
              }
              required
            />
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              disabled={submitting}
            >
              <Plus className="h-4 w-4" />
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update User"
                  : "Add New User"}
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
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Login</th>
                <th className="px-5 py-3">Last Login</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td className="px-5 py-4 text-sm text-red-600" colSpan={8}>
                    {error}
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td className="px-5 py-4 text-sm text-slate-500" colSpan={8}>
                    Loading users...
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {u.full_name}
                    </td>
                    <td className="px-5 py-4 text-slate-700">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{u.department}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm ${
                          u.status === "Active"
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            u.status === "Active" ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          u.auth_user_id
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.auth_user_id ? "Enabled" : "Not linked"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(u)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!error && !loading && filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-5 py-4 text-sm text-slate-500" colSpan={8}>
                    No users match your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
