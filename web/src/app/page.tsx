import Link from "next/link";

function Knob({ lit }: { lit?: boolean }) {
  return (
    <span
      className={`hw-knob relative mx-auto block h-28 w-28 sm:h-32 sm:w-32 ${
        lit ? "hw-knob-lit" : ""
      }`}
      aria-hidden="true"
    >
      {lit ? <span className="hw-knob-ring" /> : null}
    </span>
  );
}

export default function Home() {
  return (
    <div className="studio flex items-center justify-center px-4 py-10 sm:px-8">
      <div className="chassis w-full max-w-5xl overflow-hidden rounded-[36px] p-3 sm:p-4">
        <div className="grid overflow-hidden rounded-[28px] md:grid-cols-2">
          <section className="plate-light flex flex-col justify-center gap-6 px-8 py-14 sm:px-12 sm:py-16">
            <p className="hw-label text-[#5a6a6e]">CareLoop</p>
            <h1 className="max-w-md text-4xl font-semibold tracking-tight text-mdb-dark sm:text-5xl">
              Care enrollment, guided by voice
            </h1>
            <p className="max-w-md text-base leading-relaxed text-[#4a585c] sm:text-lg">
              Walk elderly callers through every clause. Resume if the line
              drops. Remember them the next time they call.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href="/staff"
                className="hw-btn rounded-full px-6 py-3 text-sm font-semibold"
              >
                Staff
              </Link>
              <Link
                href="/patient/demo-001"
                className="hw-btn-lit rounded-full px-6 py-3 text-sm font-semibold"
              >
                Patient
              </Link>
            </div>
          </section>

          <section className="plate-dark flex flex-col justify-center gap-10 px-8 py-14 sm:px-12 sm:py-16">
            <div className="grid grid-cols-2 gap-8">
              <Link href="/staff" className="group flex flex-col items-center gap-3">
                <Knob />
                <span className="hw-label text-[#9aa6aa] group-hover:text-white">
                  Staff
                </span>
              </Link>
              <Link
                href="/patient/demo-001"
                className="group flex flex-col items-center gap-3"
              >
                <Knob lit />
                <span className="hw-label text-mdb-spring">Patient</span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["Resume", "Memory", "Consent"].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl bg-[#0b1518] px-3 py-4 text-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)]"
                >
                  <p className="hw-label text-[#9aa6aa]">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
