const STEPS = [
  { step: 1, label: "About the Program" },
  { step: 2, label: "Your Information" },
  { step: 3, label: "Consent" },
];

export default function ProgressIndicator({
  currentStep,
  confirmedSteps,
}: {
  currentStep: number;
  confirmedSteps: number[];
}) {
  return (
    <div className="flex w-full items-start justify-center gap-2 sm:gap-4">
      {STEPS.map((s, idx) => {
        const isDone = confirmedSteps.includes(s.step);
        const isCurrent = currentStep === s.step;
        return (
          <div key={s.step} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:h-14 sm:w-14 sm:text-xl ${
                  isDone
                    ? "step-bead-done"
                    : isCurrent
                      ? "step-bead-on"
                      : "step-bead"
                }`}
              >
                {isDone ? "✓" : s.step}
              </div>
              <span
                className={`max-w-[6rem] text-center text-xs font-semibold sm:max-w-[8rem] sm:text-sm ${
                  isCurrent ? "text-mdb-spring" : "text-[#9aa6aa]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-1 mb-6 h-1.5 w-8 shrink-0 rounded-full sm:mx-2 sm:w-16 ${
                  isDone ? "rail-metal-on" : "rail-metal"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
