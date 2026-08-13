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
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold sm:h-14 sm:w-14 sm:text-xl ${
                  isDone
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : isCurrent
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                }`}
              >
                {isDone ? "✓" : s.step}
              </div>
              <span
                className={`max-w-[6rem] text-center text-xs font-semibold sm:max-w-[8rem] sm:text-sm ${
                  isCurrent ? "text-blue-800" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-1 mb-6 h-0.5 w-8 shrink-0 sm:mx-2 sm:w-16 ${
                  isDone ? "bg-emerald-600" : "bg-slate-300"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
