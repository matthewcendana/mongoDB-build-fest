"use client";

function PulseOrb({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-12 w-12 items-center justify-center" aria-hidden="true">
      <span
        className={`absolute inset-0 rounded-full bg-mdb-spring/35 ${
          active ? "motion-safe:animate-ping" : ""
        }`}
      />
      <span
        className={`relative h-8 w-8 rounded-full ${
          active ? "orb-glass" : "orb-glass-off"
        }`}
      />
    </span>
  );
}

export default function VoiceStatusBar({
  status,
  isSpeaking,
  isMuted,
  onToggleMute,
  onEnd,
}: {
  status: string;
  isSpeaking: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
}) {
  if (status === "disconnected") return null;

  const label =
    status === "connecting"
      ? "Connecting to your voice guide…"
      : isSpeaking
        ? "Your guide is speaking"
        : "Your guide is listening";

  return (
    <div className="plate-dark fixed inset-x-0 bottom-0 z-30 border-t border-white/5 px-4 py-4 text-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <PulseOrb active={status === "connected"} />
          <p className="text-lg font-bold sm:text-xl" aria-live="polite">
            {label}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="btn-raised-ivory min-h-12 cursor-pointer rounded-xl px-4 py-2 text-base font-semibold"
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="btn-raised-green min-h-12 cursor-pointer rounded-xl px-4 py-2 text-base font-semibold"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
}
