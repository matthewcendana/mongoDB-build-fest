"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { usePatientState } from "@/hooks/use-patient-state";
import { useEnrollmentVoice } from "@/hooks/use-enrollment-voice";
import type { EnrollmentFormData } from "@/lib/patient-store";
import ProgressIndicator from "./ProgressIndicator";
import VoiceStatusBar from "./VoiceStatusBar";

const PROGRAM_DESCRIPTION =
  "CareLoop helps patients manage medications, schedule appointments, and coordinate transportation to medical visits. A care coordinator may contact you to help arrange these services.";

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
      className="hw-btn-lit w-full min-w-[260px] cursor-pointer rounded-full px-10 py-5 text-xl font-semibold disabled:cursor-not-allowed sm:w-auto sm:text-2xl"
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
      className="hw-btn w-full cursor-pointer rounded-full px-6 py-4 text-xl font-semibold sm:w-auto"
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="hw-label mb-2 block text-[#5a6a6e] sm:text-xs">
      {children}
    </label>
  );
}

const inputClasses =
  "well w-full rounded-2xl px-5 py-5 text-2xl text-mdb-dark sm:text-2xl";

export default function PatientEnrollmentClient({
  patientId,
}: {
  patientId: string;
}) {
  return (
    <ConversationProvider>
      <EnrollmentExperience patientId={patientId} />
    </ConversationProvider>
  );
}

function EnrollmentExperience({ patientId }: { patientId: string }) {
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

  const voice = useEnrollmentVoice(state, {
    beginEnrollment,
    updateField,
    setUnderstandingSummary,
    goToStep,
    completeStep1,
    completeStep2,
    confirmEnrollment,
    logEvent,
  });

  const isConfirmed = enrollmentStatus === "completed";
  const voiceActive = voice.status !== "disconnected";

  return (
    <div
      className={`studio flex min-h-dvh flex-col text-mdb-dark ${
        voiceActive ? "pb-28" : ""
      }`}
    >
      <header className="plate-dark px-6 py-6 sm:py-8">
        <p className="hw-label mx-auto max-w-3xl text-center text-mdb-spring">
          CareLoop
        </p>
        <h1 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Enrollment
        </h1>
      </header>

      {currentStep > 0 && (
        <div className="plate-dark/0 border-b border-white/5 bg-[#0f1b20] px-4 py-6 sm:py-8">
          <ProgressIndicator
            currentStep={currentStep}
            confirmedSteps={confirmedSteps}
          />
        </div>
      )}

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="chassis w-full max-w-2xl rounded-[32px] p-3">
        <div className="plate-light rounded-[24px] p-8 sm:p-12">
          {currentStep === 0 && (
            <div className="flex flex-col items-center gap-8 text-center">
              <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Hi {patientFirstName}
              </p>
              <p className="max-w-lg text-2xl leading-relaxed text-[#4a443a] sm:text-3xl">
                I&apos;m your voice guide. I&apos;ll explain each step and fill
                things out with you.
              </p>
              <PrimaryButton onClick={voice.startVoice} disabled={voice.starting}>
                <span className="inline-flex items-center gap-3">
                  <MicIcon />
                  {voice.starting ? "Connecting…" : "Start Voice Guide"}
                </span>
              </PrimaryButton>
              <SecondaryButton onClick={beginEnrollment}>
                Continue without voice
              </SecondaryButton>
              {voice.error && (
                <p className="max-w-md text-lg font-semibold text-red-700" role="alert">
                  {voice.error}
                </p>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  About the program
                </h2>
                <p className="mt-6 text-2xl leading-relaxed text-[#4a443a] sm:text-2xl">
                  {PROGRAM_DESCRIPTION}
                </p>
              </div>

              <p className="text-xl font-semibold text-mdb sm:text-2xl">
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
                {voice.status === "disconnected" && (
                  <div className="mt-4">
                    <SecondaryButton onClick={voice.startVoice}>
                      Start voice guide
                    </SecondaryButton>
                  </div>
                )}
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
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
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
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Consent</h2>
              <p className="text-2xl leading-relaxed text-[#4a443a]">
                By enrolling, you agree that the {programName} may use the
                information you provided to coordinate the services described
                above. You can ask questions before deciding.
              </p>

              <div className="well rounded-2xl p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-mdb-dark sm:text-2xl">
                  Review your information
                </h3>
                <dl className="mt-4 space-y-3 text-lg sm:text-xl">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-[#6b655c]">
                      Full Name
                    </dt>
                    <dd className="text-mdb-dark">
                      {formData.fullName || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-[#6b655c]">
                      Phone Number
                    </dt>
                    <dd className="text-mdb-dark">
                      {formData.phoneNumber || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-[#6b655c]">
                      Emergency Contact
                    </dt>
                    <dd className="text-mdb-dark">
                      {formData.emergencyContactName || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <dt className="font-semibold text-[#6b655c]">
                      Relationship
                    </dt>
                    <dd className="text-mdb-dark">
                      {formData.emergencyContactRelationship || "—"}
                    </dd>
                  </div>
                  <div className="border-t border-[#d8d0c2] pt-3">
                    <dt className="font-semibold text-[#6b655c]">
                      Your understanding
                    </dt>
                    <dd className="mt-1 text-mdb-dark">
                      {understandingSummary || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {!isConfirmed ? (
                <>
                  <div className="btn-raised-ivory flex items-center justify-center rounded-2xl px-6 py-4 text-xl font-bold text-amber-950 sm:text-2xl">
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
                <div className="badge-enamel flex items-center justify-center rounded-2xl px-6 py-6 text-3xl font-semibold sm:text-4xl">
                  Enrollment confirmed ✓
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </main>

      <VoiceStatusBar
        status={voice.status}
        isSpeaking={Boolean(voice.isSpeaking)}
        isMuted={Boolean(voice.isMuted)}
        onToggleMute={() => voice.setMuted?.(!voice.isMuted)}
        onEnd={voice.stopVoice}
      />
    </div>
  );
}
