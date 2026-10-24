import { Lightbulb } from 'lucide-react';

export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-indigo-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-indigo-400/20" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-semibold">BankIde</p>
            <p className="text-sm text-indigo-200">Bank ide, bukan bank data yang terlupakan.</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-200">
            Dari catatan menjadi dampak
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
            Tempat rapi untuk ide yang layak dikerjakan.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-indigo-100">
            Kelola ide, jadwalkan pengingat, impor spreadsheet lama, dan temukan peluang baru
            tanpa kehilangan konteks.
          </p>
        </div>

        <div className="relative grid max-w-md grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-2xl font-semibold">01</p>
            <p className="mt-1 text-indigo-200">Kumpulkan</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">02</p>
            <p className="mt-1 text-indigo-200">Prioritaskan</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">03</p>
            <p className="mt-1 text-indigo-200">Eksekusi</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white">
              <Lightbulb className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold text-slate-900">BankIde</span>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
