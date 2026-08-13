import type { EnrollmentStatus } from "@/lib/patient-store";

const STATUS_CONFIG: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  ready: {
    label: "Ready to invite",
    className: "bg-slate-100 text-slate-700 ring-slate-300",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800 ring-amber-300",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  },
};

export default function StatusBadge({
  status,
  className = "",
}: {
  status: EnrollmentStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${config.className} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ready"
            ? "bg-slate-500"
            : status === "in_progress"
              ? "bg-amber-500"
              : "bg-emerald-500"
        }`}
      />
      {config.label}
    </span>
  );
}
