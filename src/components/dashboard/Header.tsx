"use client";

import { useEffect,useCallback, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  ChevronDown,
  MapPin,
  Menu,
  Search,
  UserCircle2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_CLINIC_ID, getActiveClinicId, setActiveClinicId } from "@/lib/clinic";

type HeaderProps = {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
};

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [selectedClinicId, setSelectedClinicId] = useState(DEFAULT_CLINIC_ID);
  const [selectedClinic, setSelectedClinic] = useState("Central Clinic");
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([]);
  const [newClinicName, setNewClinicName] = useState("");
  const [addingClinic, setAddingClinic] = useState(false);
  const [clinicError, setClinicError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("User");
  const [profileRole, setProfileRole] = useState("Staff");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [clinicOpen, setClinicOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    "High no-show risk detected for tomorrow morning.",
    "2 lab reports were uploaded in the last hour.",
    "Clinic settings were updated successfully.",
  ]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  async function loadClinics() {
    const clinicId = getActiveClinicId();
    const res = await fetch("/api/clinics", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) return;
    const rows = payload.clinics ?? [];
    setClinics(rows);
    const selected = rows.find((c: { id: string; name: string }) => c.id === clinicId);
    if (selected) setSelectedClinic(selected.name);
  }

  useEffect(() => {
    const clinicId = getActiveClinicId();
    setSelectedClinicId(clinicId);
    void loadClinics();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch("/api/users", {
        cache: "no-store",
        headers: { "x-clinic-id": getActiveClinicId() },
      });
      const payload = await res.json();
      if (!res.ok) return;
      const users = (payload.users ?? []) as Array<{
        auth_user_id?: string | null;
        email?: string;
        full_name?: string;
        role?: string;
      }>;
      const linked = users.find(
        (u) => u.auth_user_id === user.id || u.email === user.email
      );
      if (linked?.full_name) setProfileName(linked.full_name);
      if (linked?.role) setProfileRole(linked.role);
    }

    void loadProfile();
    window.addEventListener("focus", loadProfile);
    window.addEventListener("profile-updated", loadProfile);
    return () => {
      window.removeEventListener("focus", loadProfile);
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setClinicOpen(false);
        setProfileOpen(false);
      }
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  const applySearch = useCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString());
  
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
  
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }, [searchParams, router, pathname]);
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  const q = searchParams.get("q");
  if (q) {
    applySearch(q);
  }
}, [searchParams]);// ✅ MUST include applySearch
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = (searchParams.get("q") ?? "").trim();
      const next = search.trim();
      if (current !== next) {
        applySearch(search);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, pathname, searchParams]);

  return (
    <header
      ref={wrapperRef}
      className="sticky top-0 z-30 flex flex-col gap-4 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <form
          className="relative w-full min-w-0 sm:max-w-md lg:max-w-lg"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch(search);
          }}
        >
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search patients, records, doctors..."
            className="w-full rounded-full border border-slate-200/80 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:bg-white focus:ring-4"
            aria-label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                applySearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </form>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setClinicOpen((v) => !v);
                setNotificationsOpen(false);
                setProfileOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
              <span className="max-w-[120px] truncate">{selectedClinic}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
            </button>
            {clinicOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {clinics.map((clinic) => (
                    <button
                      key={clinic.id}
                      type="button"
                      onClick={() => {
                        setSelectedClinic(clinic.name);
                        setSelectedClinicId(clinic.id);
                        setActiveClinicId(clinic.id);
                        setClinicOpen(false);
                        router.refresh();
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        selectedClinicId === clinic.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {clinic.name}
                    </button>
                  ))}
                <div className="mt-1 border-t border-slate-100 p-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Add Clinic
                  </p>
                  <input
                    className="mb-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    placeholder="Clinic name"
                    value={newClinicName}
                    onChange={(e) => setNewClinicName(e.target.value)}
                  />
                  {clinicError ? (
                    <p className="mb-2 text-xs text-red-600">{clinicError}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={addingClinic || !newClinicName.trim()}
                    onClick={async () => {
                      setAddingClinic(true);
                      setClinicError(null);
                      const res = await fetch("/api/clinics", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newClinicName.trim() }),
                      });
                      const payload = await res.json();
                      if (!res.ok) {
                        setClinicError(payload.error ?? "Failed to create clinic.");
                        setAddingClinic(false);
                        return;
                      }
                      const clinic = payload.clinic as { id: string; name: string };
                      setNewClinicName("");
                      setSelectedClinic(clinic.name);
                      setSelectedClinicId(clinic.id);
                      setActiveClinicId(clinic.id);
                      await loadClinics();
                      setClinicOpen(false);
                      setAddingClinic(false);
                      router.refresh();
                    }}
                    className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {addingClinic ? "Adding..." : "Add Clinic"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((v) => !v);
                setClinicOpen(false);
                setProfileOpen(false);
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              ) : null}
            </button>
            {notificationsOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Notifications
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600"
                    onClick={() => setNotifications([])}
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">
                    No new notifications.
                  </p>
                ) : (
                  notifications.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {item}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setClinicOpen(false);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-semibold text-slate-700">
                VS
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium text-slate-900">
                  {profileName}
                </p>
                <p className="truncate text-xs text-slate-500">{profileRole}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {profileOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => router.push("/profile")}
                >
                  <UserCircle2 className="h-4 w-4" />
                  View Profile
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.replace("/login");
                  }}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

