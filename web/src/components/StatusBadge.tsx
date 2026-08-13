import type { EnrollmentStatus } from "@/lib/patient-store";

const STATUS_CONFIG: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  ready: {
    label: "Ready to invite",
    className: "hw-btn",
  },
  in_progress: {
    label: "In Progress",
    className: "hw-btn-lit",
  },
  completed: {
    label: "Completed",
    className: "badge-enamel",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${config.className} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ready"
            ? "bg-slate-500"
            : status === "in_progress"
              ? "bg-amber-500"
              : "bg-mdb-leaf"
        }`}
      />
      {config.label}
    </span>
  );
}
