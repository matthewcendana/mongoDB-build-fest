import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-slate-50 px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Care Enrollment Platform
        </h1>
        <p className="mt-2 text-slate-500">
          Elderly healthcare enrollment assistant — hackathon MVP
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/staff"
          className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          Staff Dashboard
        </Link>
        <Link
          href="/patient/demo-001"
          className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
        >
          Patient Enrollment (demo-001)
        </Link>
      </div>
    </div>
  );
}
