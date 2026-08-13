"use client";

import { usePatientState } from "@/hooks/use-patient-state";
import type { EnrollmentFormData } from "@/lib/patient-store";
import ProgressIndicator from "./ProgressIndicator";

const PROGRAM_DESCRIPTION =
  "The HeartHealth Support Program helps patients manage medications, schedule appointments, and coordinate transportation to medical visits. A care coordinator may contact you to help arrange these services.";

const SIMULATED_UNDERSTANDING =
  "This program will help me keep track of my medicines, remind me about doctor visits, and help arrange rides to appointments. A care coordinator will call me to help set this up.";

const SIMULATED_CONTACT_INFO: Partial<EnrollmentFormData> = {
  phoneNumber: "(555) 214-7788",
  emergencyContactName: "Daniel Johnson",
  emergencyContactRelationship: "Son",
};

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7 sm:h-8 sm:w-8"
      aria-hidden="true"
    >
      <path
        d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
        fill="currentColor"
      />
      <path
        d="M19 11a7 7 0 01-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full min-w-[260px] rounded-2xl bg-blue-700 px-10 py-6 text-2xl font-bold text-white shadow-md transition-colors hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:text-3xl"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border-2 border-slate-400 px-6 py-4 text-xl font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 sm:w-auto"
    >
      {children}
    </button>
  );
}

function TestButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-5 py-3 text-base font-semibold text-purple-700 transition-colors hover:bg-purple-100"
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xl font-bold text-slate-800 sm:text-2xl">
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-2xl border-2 border-slate-300 px-5 py-5 text-2xl text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:text-2xl";

export default function PatientEnrollmentClient({
  patientId,
}: {
  patientId: string;
}) {
  const { state, mutate, logEvent } = usePatientState(patientId);

  const {
    currentStep,
    formData,
    understandingSummary,
    confirmedSteps,
    enrollmentStatus,
    patientFirstName,
    programName,
  } = state;

  function beginEnrollment() {
    mutate((prev) => ({
      ...prev,
      currentStep: 1,
      enrollmentStatus:
        prev.enrollmentStatus === "ready" ? "in_progress" : prev.enrollmentStatus,
    }));
    logEvent(`${state.patientFirstName} started the enrollment (Voice Guide)`);
  }

  function goToStep(step: number) {
    mutate((prev) => ({ ...prev, currentStep: step }));
  }

  function setUnderstandingSummary(value: string) {
    mutate((prev) => ({ ...prev, understandingSummary: value }));
  }

  function simulateUnderstanding() {
    setUnderstandingSummary(SIMULATED_UNDERSTANDING);
  }

  function completeStep1() {
    mutate((prev) => ({
      ...prev,
      currentStep: 2,
      confirmedSteps: prev.confirmedSteps.includes(1)
        ? prev.confirmedSteps
        : [...prev.confirmedSteps, 1],
    }));
    logEvent("Reviewed the program overview");
  }

  function updateField(field: keyof EnrollmentFormData, value: string) {
    mutate((prev) => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
    }));
  }

  function simulateVoiceFill() {
    mutate((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...SIMULATED_CONTACT_INFO },
    }));
  }

  function completeStep2() {
    mutate((prev) => ({
      ...prev,
      currentStep: 3,
      confirmedSteps: prev.confirmedSteps.includes(2)
        ? prev.confirmedSteps
        : [...prev.confirmedSteps, 2],
    }));
    logEvent("Provided contact and emergency information");
  }

  function confirmEnrollment() {
    mutate((prev) => ({
      ...prev,
      enrollmentStatus: "completed",
      confirmedSteps: prev.confirmedSteps.includes(3)
        ? prev.confirmedSteps
        : [...prev.confirmedSteps, 3],
    }));
    logEvent(`${state.patientFirstName} confirmed enrollment ✓`);
  }

  const isConfirmed = enrollmentStatus === "completed";

  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900">
      <header className="border-b-2 border-blue-900 bg-blue-900 px-6 py-6 sm:py-8">
        <h1 className="mx-auto max-w-3xl text-center text-3xl font-extrabold text-white sm:text-4xl">
          HeartHealth Enrollment
        </h1>
      </header>

      {currentStep > 0 && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-6 sm:py-8">
          <ProgressIndicator
            currentStep={currentStep}
            confirmedSteps={confirmedSteps}
          />
        </div>
      )}

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-2xl rounded-3xl border-2 border-slate-200 p-8 shadow-sm sm:p-12">
          {currentStep === 0 && (
            <div className="flex flex-col items-center gap-8 text-center">
              <p className="text-4xl font-extrabold sm:text-5xl">
                Hi {patientFirstName}
              </p>
              <p className="max-w-lg text-2xl leading-relaxed text-slate-700 sm:text-3xl">
                I&apos;m your voice guide. I&apos;ll explain each step and fill
                things out with you.
              </p>
              <PrimaryButton onClick={beginEnrollment}>
                <span className="inline-flex items-center gap-3">
                  <MicIcon />
                  Start Voice Guide
                </span>
              </PrimaryButton>
            </div>
          )}

          {currentStep === 1 && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-3xl font-extrabold sm:text-4xl">
                  About the program
                </h2>
                <p className="mt-6 text-2xl leading-relaxed text-slate-700 sm:text-2xl">
                  {PROGRAM_DESCRIPTION}
                </p>
              </div>

              <p className="text-xl font-semibold text-blue-900 sm:text-2xl">
                Before continuing, we&apos;ll make sure this makes sense.
              </p>

              <div>
                <FieldLabel>Your understanding</FieldLabel>
                <textarea
                  value={understandingSummary}
                  onChange={(e) => setUnderstandingSummary(e.target.value)}
                  placeholder="Tell us in your own words what this program does…"
                  className={`${inputClasses} min-h-[200px] resize-none leading-relaxed`}
                />
                <div className="mt-4">
                  <TestButton onClick={simulateUnderstanding}>
                    <MicIcon />
                    Simulate voice input (test)
                  </TestButton>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
                <SecondaryButton onClick={() => goToStep(0)}>
                  Back
                </SecondaryButton>
                <PrimaryButton
                  onClick={completeStep1}
                  disabled={understandingSummary.trim().length === 0}
                >
                  Continue
                </PrimaryButton>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-8">
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Your information
              </h2>

              <div className="flex flex-col gap-6">
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      updateField("phoneNumber", e.target.value)
                    }
                    placeholder="(555) 123-4567"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel>Emergency Contact Name</FieldLabel>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) =>
                      updateField("emergencyContactName", e.target.value)
                    }
                    placeholder="Full name"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel>Emergency Contact Relationship</FieldLabel>
                  <input
                    type="text"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) =>
                      updateField(
                        "emergencyContactRelationship",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Son, Daughter, Friend"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <TestButton onClick={simulateVoiceFill}>
                  <MicIcon />
                  Simulate voice fill (test)
                </TestButton>
              </div>

              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
                <SecondaryButton onClick={() => goToStep(1)}>
                  Back
                </SecondaryButton>
                <PrimaryButton onClick={completeStep2}>
                  Continue
                </PrimaryButton>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-8">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Consent</h2>
              <p className="text-2xl leading-relaxed text-slate-700">
                By enrolling, you agree that the {programName} may use the
                information you provided to coordinate the services described
                above. You can ask questions before deciding.
              </p>

              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-800 sm:text-2xl">
                  Review your information
                </h3>
                <dl className="mt-4 space-y-3 text-lg sm:text-xl">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-slate-500">
                      Full Name
                    </dt>
                    <dd className="text-slate-900">
                      {formData.fullName || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-slate-500">
                      Phone Number
                    </dt>
                    <dd className="text-slate-900">
                      {formData.phoneNumber || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-slate-500">
                      Emergency Contact
                    </dt>
                    <dd className="text-slate-900">
                      {formData.emergencyContactName || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-slate-500">
                      Relationship
                    </dt>
                    <dd className="text-slate-900">
                      {formData.emergencyContactRelationship || "—"}
                    </dd>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <dt className="font-semibold text-slate-500">
                      Your understanding
                    </dt>
                    <dd className="mt-1 text-slate-900">
                      {understandingSummary || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {!isConfirmed ? (
                <>
                  <div className="flex items-center justify-center rounded-2xl bg-amber-50 px-6 py-4 text-xl font-bold text-amber-800 ring-1 ring-inset ring-amber-200 sm:text-2xl">
                    Waiting for your confirmation
                  </div>
                  <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
                    <SecondaryButton onClick={() => goToStep(2)}>
                      Back
                    </SecondaryButton>
                    <PrimaryButton onClick={confirmEnrollment}>
                      Confirm Enrollment
                    </PrimaryButton>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center rounded-2xl bg-emerald-50 px-6 py-6 text-3xl font-extrabold text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:text-4xl">
                  Enrollment confirmed ✓
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
