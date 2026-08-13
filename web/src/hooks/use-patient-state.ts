"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  PatientState,
  ensurePatientState,
  subscribeToPatient,
  getPatientSnapshot,
  getPatientServerSnapshot,
  writePatientState,
  makeAuditEvent,
} from "@/lib/patient-store";

export function usePatientState(patientId: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToPatient(patientId, onStoreChange),
    [patientId]
  );
  const getSnapshot = useCallback(
    () => getPatientSnapshot(patientId),
    [patientId]
  );
  const getServerSnapshot = useCallback(
    () => getPatientServerSnapshot(patientId),
    [patientId]
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensurePatientState(patientId);
  }, [patientId]);

  const mutate = useCallback(
    (updater: (prev: PatientState) => PatientState) => {
      writePatientState(updater(getPatientSnapshot(patientId)));
    },
    [patientId]
  );

  const logEvent = useCallback(
    (message: string) => {
      mutate((prev) => ({
        ...prev,
        auditEvents: [...prev.auditEvents, makeAuditEvent(message)],
      }));
    },
    [mutate]
  );

  return { state, mutate, logEvent };
}
