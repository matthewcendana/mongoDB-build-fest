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
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Care Enrollment Dashboard
          </h1>
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Reset demo data
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  MJ
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {state.patientFullName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {state.programName}
                  </p>
                </div>
              </div>
            </div>
            <StatusBadge status={state.enrollmentStatus} className="shrink-0" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
            <button
              onClick={handleSendLink}
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
            >
              Send enrollment link
            </button>
            <Link
              href={`/patient/${PATIENT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenPreview}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Open patient experience
            </Link>
            {justSent && (
              <span className="text-sm font-medium text-emerald-600">
                Link sent ✓
              </span>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-lg font-bold text-slate-900">Audit Trail</h3>
          <p className="mt-1 text-sm text-slate-500">
            Timestamped activity for this patient&apos;s enrollment.
          </p>

          <ol className="mt-6 space-y-4">
            {orderedEvents.length === 0 && (
              <li className="text-sm text-slate-400">No activity yet.</li>
            )}
            {orderedEvents.map((event) => (
              <li key={event.id} className="flex gap-4">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {event.message}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
