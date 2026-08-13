"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useConversation,
  useConversationClientTool,
} from "@elevenlabs/react";
import type { EnrollmentFormData, PatientState } from "@/lib/patient-store";
import {
  backendFieldName,
  clauseToStep,
  fetchBackendSnapshot,
  fetchVoiceSession,
  mapToolField,
  persistTool,
  resolveCallerPhone,
} from "@/lib/voice-session";

type ToolParams = Record<string, unknown>;

type VoiceCallbacks = {
  beginEnrollment: () => void;
  updateField: (field: keyof EnrollmentFormData, value: string) => void;
  setUnderstandingSummary: (value: string) => void;
  goToStep: (step: number) => void;
  completeStep1: () => void;
  completeStep2: () => void;
  confirmEnrollment: () => void;
  logEvent: (message: string) => void;
};

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requestMicPermission() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export function useEnrollmentVoice(
  state: PatientState,
  callbacks: VoiceCallbacks
) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const callbacksRef = useRef(callbacks);
  const stateRef = useRef(state);
  callbacksRef.current = callbacks;
  stateRef.current = state;

  const conversation = useConversation({
    onConnect: () => {
      if (stateRef.current.currentStep === 0) {
        callbacksRef.current.beginEnrollment();
      }
      callbacksRef.current.logEvent("Started the ElevenLabs voice guide");
    },
    onError: (message) => {
      setError(message || "Voice guide error.");
    },
    onDisconnect: (details) => {
      const reason =
        details && typeof details === "object" && "reason" in details
          ? String((details as { reason?: string }).reason || "")
          : "";
      if (reason && /error|fail|close/i.test(reason)) {
        setError(`Voice connection dropped: ${reason}`);
      }
    },
  });

  const startSessionRef = useRef(conversation.startSession);
  const endSessionRef = useRef(conversation.endSession);
  startSessionRef.current = conversation.startSession;
  endSessionRef.current = conversation.endSession;

  const applyField = useCallback((field: string, value: string, overwrite = true) => {
    const mapped = mapToolField(field);
    if (!mapped || !value) return;
    if (!overwrite && stateRef.current.formData[mapped]) return;
    callbacksRef.current.updateField(mapped, value);
  }, []);

  useConversationClientTool("get_caller_context", () => {
    const current = stateRef.current;
    const phone = resolveCallerPhone(current);
    return JSON.stringify({
      phone,
      current_step: current.currentStep,
      known_fields: {
        name: current.formData.fullName,
        phone: current.formData.phoneNumber,
        emergency_contact_name: current.formData.emergencyContactName,
        emergency_contact_relationship:
          current.formData.emergencyContactRelationship,
      },
      understanding: current.understandingSummary,
      status: current.enrollmentStatus,
    });
  });

  useConversationClientTool("upsert_field", async (params: ToolParams) => {
    const field = asString(params.field);
    const value = asString(params.value);
    applyField(field, value);
    const phone = resolveCallerPhone(stateRef.current);
    void persistTool("/tools/upsert_field", {
      phone,
      field: backendFieldName(field),
      value,
    });
    callbacksRef.current.logEvent(`Voice guide filled ${field}`);
    return `Saved ${field}`;
  });

  useConversationClientTool("record_comprehension", async (params: ToolParams) => {
    const summary = asString(params.summary);
    const clauseId = asNumber(params.clause_id, 0);
    if (summary) {
      callbacksRef.current.setUnderstandingSummary(summary);
    }
    const step = clauseToStep(clauseId);
    if (step === 1) {
      callbacksRef.current.completeStep1();
    } else if (step === 2) {
      callbacksRef.current.completeStep2();
    } else {
      callbacksRef.current.goToStep(step);
    }
    const phone = resolveCallerPhone(stateRef.current);
    void persistTool("/tools/record_comprehension", {
      phone,
      clause_id: clauseId,
      summary,
    });
    callbacksRef.current.logEvent("Voice guide recorded understanding");
    return "Comprehension recorded";
  });

  useConversationClientTool("record_consent", async () => {
    callbacksRef.current.goToStep(3);
    callbacksRef.current.confirmEnrollment();
    const phone = resolveCallerPhone(stateRef.current);
    void persistTool("/tools/record_consent", { phone });
    callbacksRef.current.logEvent("Voice guide recorded consent");
    return "Consent recorded";
  });

  useConversationClientTool("advance_step", async (params: ToolParams) => {
    const step = asNumber(params.step, stateRef.current.currentStep + 1);
    if (step === 1) callbacksRef.current.completeStep1();
    else if (step === 2) callbacksRef.current.completeStep2();
    else if (step >= 3) {
      callbacksRef.current.goToStep(3);
    } else {
      callbacksRef.current.goToStep(step);
    }
    return `Moved to step ${step}`;
  });

  useEffect(() => {
    if (conversation.status !== "connected") return;
    const phone = resolveCallerPhone(stateRef.current);
    const timer = window.setInterval(async () => {
      const snapshot = await fetchBackendSnapshot(phone);
      if (!snapshot) return;
      const known = {
        ...(snapshot.profile || {}),
        ...(snapshot.values?.known_fields || {}),
      };
      for (const [field, value] of Object.entries(known)) {
        if (value) applyField(field, value, false);
      }
      const summaries = snapshot.values?.confirmed_clauses || [];
      const latest = [...summaries].reverse().find((item) => item.summary);
      if (latest?.summary && !stateRef.current.understandingSummary) {
        callbacksRef.current.setUnderstandingSummary(latest.summary);
      }
      const clause = Number(snapshot.values?.current_clause || 0);
      const step = clauseToStep(clause);
      if (step > stateRef.current.currentStep) {
        callbacksRef.current.goToStep(step);
      }
      if (
        snapshot.values?.status === "completed" &&
        stateRef.current.enrollmentStatus !== "completed"
      ) {
        callbacksRef.current.confirmEnrollment();
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [applyField, conversation.status]);

  const startVoice = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      await requestMicPermission();
      const phone = resolveCallerPhone(stateRef.current);
      const session = await fetchVoiceSession(phone);
      const shared = {
        userId: phone,
        dynamicVariables: session.dynamicVariables,
        overrides: session.firstMessage
          ? {
              agent: {
                firstMessage: session.firstMessage,
                language: "en" as const,
              },
            }
          : undefined,
      };
      if (session.signedUrl) {
        startSessionRef.current({
          ...shared,
          signedUrl: session.signedUrl,
          connectionType: "websocket",
        });
      } else if (session.conversationToken) {
        startSessionRef.current({
          ...shared,
          conversationToken: session.conversationToken,
          connectionType: "webrtc",
        });
      } else if (session.agentId) {
        startSessionRef.current({
          ...shared,
          agentId: session.agentId,
          connectionType: "websocket",
        });
      } else {
        throw new Error("ElevenLabs did not return a session.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start the voice guide.";
      if (/notallowed|permission|denied/i.test(message)) {
        setError("Please allow the microphone so I can talk with you.");
      } else {
        setError(message);
      }
    } finally {
      setStarting(false);
    }
  }, []);

  const stopVoice = useCallback(async () => {
    endSessionRef.current();
  }, []);

  return {
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    isMuted: conversation.isMuted,
    setMuted: conversation.setMuted,
    starting,
    error,
    startVoice,
    stopVoice,
  };
}
