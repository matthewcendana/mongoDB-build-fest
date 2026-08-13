"use client";

import { useState } from "react";
import Link from "next/link";
import { usePatientState } from "@/hooks/use-patient-state";
import { resetPatientState } from "@/lib/patient-store";
import StatusBadge from "@/components/StatusBadge";

const PATIENT_ID = "demo-001";

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function StaffDashboardPage() {
  const { state, logEvent } = usePatientState(PATIENT_ID);
  const [justSent, setJustSent] = useState(false);

  function handleSendLink() {
    logEvent(`Enrollment link sent to ${state.patientFullName}`);
    setJustSent(true);
    window.setTimeout(() => setJustSent(false), 2500);
  }

  function handleOpenPreview() {
    logEvent("Staff previewed the patient enrollment experience");
  }

  function handleReset() {
    resetPatientState(PATIENT_ID);
  }

  const orderedEvents = [...state.auditEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="studio px-4 py-8 sm:px-8">
      <div className="chassis mx-auto max-w-5xl overflow-hidden rounded-[32px]">
      <header className="plate-dark">
        <div className="flex items-center justify-between px-6 py-6 sm:px-8">
          <div>
            <p className="hw-label text-mdb-spring">
              CareLoop
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Enrollment Dashboard
            </h1>
          </div>
          <button
            onClick={handleReset}
            className="hw-btn-lit rounded-full px-3 py-1.5 text-xs font-medium"
          >
            Reset demo data
          </button>
        </div>
      </header>

      <main className="plate-light px-6 py-10 sm:px-8">
        <section className="rounded-2xl bg-white/70 p-6 shadow-[inset_0_1px_0_#fff,0_8px_20px_rgba(0,0,0,0.08)] sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-3">
                <div className="avatar-enamel flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white">
                  MJ
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-mdb-dark">
                    {state.patientFullName}
                  </h2>
                  <p className="text-sm text-[#5c564c]">
                    {state.programName}
                  </p>
                </div>
              </div>
            </div>
            <StatusBadge status={state.enrollmentStatus} className="shrink-0" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#d8d0c2] pt-6">
            <button
              onClick={handleSendLink}
              className="hw-btn-lit rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Send enrollment link
            </button>
            <Link
              href={`/patient/${PATIENT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenPreview}
              className="hw-btn rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Open patient experience
            </Link>
            {justSent && (
              <span className="text-sm font-medium text-mdb">
                Link sent ✓
              </span>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white/70 p-6 shadow-[inset_0_1px_0_#fff,0_8px_20px_rgba(0,0,0,0.08)] sm:p-8">
          <h3 className="text-lg font-semibold text-mdb-dark">Audit Trail</h3>
          <p className="mt-1 text-sm text-[#5c564c]">
            Timestamped activity for this patient&apos;s enrollment.
          </p>

          <ol className="mt-6 space-y-4">
            {orderedEvents.length === 0 && (
              <li className="text-sm text-[#8a8478]">No activity yet.</li>
            )}
            {orderedEvents.map((event) => (
              <li key={event.id} className="flex gap-4">
                <div className="pin-dot mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-mdb-dark">
                    {event.message}
                  </p>
                  <p className="text-xs text-[#8a8478]">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      </div>
    </div>
  );
}
