import type { EnrollmentFormData, PatientState } from "@/lib/patient-store";

export type VoiceSessionAuth = {
  conversationToken?: string;
  signedUrl?: string;
  agentId?: string;
  firstMessage?: string;
  dynamicVariables?: Record<string, string>;
};

export type BackendSnapshot = {
  values?: {
    known_fields?: Record<string, string>;
    current_clause?: number;
    confirmed_clauses?: Array<{ clause_id?: number; summary?: string }>;
    status?: string;
  };
  profile?: Record<string, string> | null;
};

const FRONTEND_FIELDS: Record<string, keyof EnrollmentFormData> = {
  name: "fullName",
  full_name: "fullName",
  fullname: "fullName",
  fullName: "fullName",
  phone: "phoneNumber",
  phone_number: "phoneNumber",
  phonenumber: "phoneNumber",
  phoneNumber: "phoneNumber",
  emergency_contact_name: "emergencyContactName",
  emergencycontactname: "emergencyContactName",
  emergencyContactName: "emergencyContactName",
  emergency_contact_relationship: "emergencyContactRelationship",
  emergencycontactrelationship: "emergencyContactRelationship",
  emergencyContactRelationship: "emergencyContactRelationship",
};

const BACKEND_FIELDS: Record<string, string> = {
  fullName: "name",
  full_name: "name",
  name: "name",
  phoneNumber: "phone",
  phone_number: "phone",
  phone: "phone",
  email: "email",
  dob: "dob",
  emergencyContactName: "emergency_contact_name",
  emergency_contact_name: "emergency_contact_name",
  emergencyContactRelationship: "emergency_contact_relationship",
  emergency_contact_relationship: "emergency_contact_relationship",
};

export function demoPhoneForPatient(patientId: string): string {
  const digits = patientId.replace(/\D/g, "") || "1";
  return `+1555214${digits.padStart(4, "0").slice(-4)}`;
}

export function resolveCallerPhone(state: PatientState): string {
  const typed = state.formData.phoneNumber.replace(/\D/g, "");
  if (typed.length >= 10) {
    return `+1${typed.slice(-10)}`;
  }
  return demoPhoneForPatient(state.patientId);
}

export function mapToolField(field: string): keyof EnrollmentFormData | null {
  return FRONTEND_FIELDS[field] ?? FRONTEND_FIELDS[field.replace(/[\s-]/g, "")] ?? null;
}

export function backendFieldName(field: string): string {
  return BACKEND_FIELDS[field] ?? field;
}

export function clauseToStep(clauseId: number): number {
  if (clauseId >= 4) return 3;
  if (clauseId >= 2) return 2;
  return 1;
}

export async function fetchVoiceSession(phone: string): Promise<VoiceSessionAuth> {
  const response = await fetch(
    `/api/elevenlabs/session?phone=${encodeURIComponent(phone)}`
  );
  const body = (await response.json().catch(() => ({}))) as VoiceSessionAuth & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "Could not start the voice guide.");
  }
  return body;
}

export async function persistTool(path: string, body: unknown): Promise<void> {
  try {
    await fetch(`/api/persistence${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Persistence is best-effort while the voice session is live.
  }
}

export async function fetchBackendSnapshot(
  phone: string
): Promise<BackendSnapshot | null> {
  try {
    const response = await fetch(
      `/api/persistence/debug/state/${encodeURIComponent(phone)}`
    );
    if (!response.ok) return null;
    return (await response.json()) as BackendSnapshot;
  } catch {
    return null;
  }
}
