export type EnrollmentStatus = "ready" | "in_progress" | "completed";

export interface EnrollmentFormData {
  fullName: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  message: string;
}

export interface PatientState {
  patientId: string;
  patientFirstName: string;
  patientFullName: string;
  programName: string;
  currentStep: number;
  formData: EnrollmentFormData;
  understandingSummary: string;
  confirmedSteps: number[];
  enrollmentStatus: EnrollmentStatus;
  auditEvents: AuditEvent[];
}

const STORAGE_PREFIX = "careflow:patient:";
const UPDATE_EVENT = "careflow:patient-update";

function storageKey(patientId: string) {
  return `${STORAGE_PREFIX}${patientId}`;
}

export function createDefaultPatientState(patientId: string): PatientState {
  return {
    patientId,
    patientFirstName: "Mary",
    patientFullName: "Mary Johnson",
    programName: "HeartHealth Support Program",
    currentStep: 0,
    formData: {
      fullName: "Mary Johnson",
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
    },
    understandingSummary: "",
    confirmedSteps: [],
    enrollmentStatus: "ready",
    auditEvents: [],
  };
}

export function makeAuditEvent(message: string): AuditEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    message,
  };
}

export function readPatientState(patientId: string): PatientState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(patientId));
    if (!raw) return null;
    return JSON.parse(raw) as PatientState;
  } catch {
    return null;
  }
}

export function writePatientState(state: PatientState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(state.patientId), JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent(UPDATE_EVENT, { detail: { patientId: state.patientId } })
  );
}

export function resetPatientState(patientId: string) {
  if (typeof window === "undefined") return;
  writeDefaultPatientState(patientId);
}

function writeDefaultPatientState(patientId: string): PatientState {
  const fresh = createDefaultPatientState(patientId);
  fresh.auditEvents = [
    makeAuditEvent(`Patient record created for ${fresh.patientFullName}`),
  ];
  writePatientState(fresh);
  return fresh;
}

export function ensurePatientState(patientId: string): PatientState {
  const existing = readPatientState(patientId);
  if (existing) return existing;
  return writeDefaultPatientState(patientId);
}

const snapshotCache = new Map<
  string,
  { raw: string | null; parsed: PatientState }
>();
const defaultSnapshotCache = new Map<string, PatientState>();

function getDefaultSnapshot(patientId: string): PatientState {
  let cached = defaultSnapshotCache.get(patientId);
  if (!cached) {
    cached = createDefaultPatientState(patientId);
    defaultSnapshotCache.set(patientId, cached);
  }
  return cached;
}

/** Referentially stable snapshot for useSyncExternalStore: reparses only when the raw string changes. */
export function getPatientSnapshot(patientId: string): PatientState {
  if (typeof window === "undefined") return getDefaultSnapshot(patientId);

  const raw = window.localStorage.getItem(storageKey(patientId));
  const cached = snapshotCache.get(patientId);
  if (cached && cached.raw === raw) return cached.parsed;

  let parsed: PatientState;
  try {
    parsed = raw ? (JSON.parse(raw) as PatientState) : getDefaultSnapshot(patientId);
  } catch {
    parsed = getDefaultSnapshot(patientId);
  }
  snapshotCache.set(patientId, { raw, parsed });
  return parsed;
}

export function getPatientServerSnapshot(patientId: string): PatientState {
  return getDefaultSnapshot(patientId);
}

export function subscribeToPatient(patientId: string, onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ patientId: string }>).detail;
    if (!detail || detail.patientId === patientId) onChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey(patientId)) onChange();
  };

  window.addEventListener(UPDATE_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(UPDATE_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}
