export const DEFAULT_CLINIC_ID = "central-clinic";
export const CLINIC_STORAGE_KEY = "active_clinic_id";

export function getActiveClinicId() {
  if (typeof window === "undefined") return DEFAULT_CLINIC_ID;
  return localStorage.getItem(CLINIC_STORAGE_KEY) ?? DEFAULT_CLINIC_ID;
}

export function setActiveClinicId(clinicId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLINIC_STORAGE_KEY, clinicId);
  window.dispatchEvent(new CustomEvent("clinic-changed", { detail: { clinicId } }));
}
