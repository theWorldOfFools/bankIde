import { Lightbulb, Sparkles, Target, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

const highlights = [
  {
    icon: Zap,
    title: 'Kumpulkan',
    description: 'Simpan ide dan konteksnya tanpa kehilangan momentum.',
  },
  {
    icon: Target,
    title: 'Prioritaskan',
    description: 'Pantau pipeline, pengingat, dan progres eksekusi.',
  },
  {
    icon: Sparkles,
    title: 'Eksekusi',
    description: 'Checklist harian, task, lampiran, dan link demo.',
  },
];

export default function AuthShell({ children }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="app-canvas grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(700px_500px_at_20%_0%,rgba(99,102,241,0.45),transparent_60%),radial-gradient(600px_500px_at_100%_100%,rgba(217,70,239,0.32),transparent_55%)]" />
        <div className="aurora-grid absolute inset-0 opacity-30" />
        <motion.div
          animate={reducedMotion ? undefined : { y: [0, -26, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-20 top-[12%] h-72 w-72 rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-xl"
        />
        <motion.div
          animate={reducedMotion ? undefined : { y: [0, 22, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[14%] left-[-4rem] h-64 w-64 rounded-[2.5rem] border border-white/10 bg-indigo-400/10 backdrop-blur-xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-bold tracking-tight">BankIde</p>
            <p className="text-sm text-indigo-200">Bank ide, bukan bank data yang terlupakan.</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-200">
            Dari catatan menjadi dampak
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Tempat rapi untuk ide yang{' '}
            <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
              layak dikerjakan.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-indigo-100/80">
            Kelola ide, jadwalkan pengingat, impor spreadsheet lama, dan temukan peluang baru
            tanpa kehilangan konteks.
          </p>

          <div className="mt-8 grid gap-3">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.5 }}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-indigo-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-indigo-100/65">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] font-medium text-indigo-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Workspace aman dengan sesi cookie httpOnly
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24, rotateX: 4 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformPerspective: 1200 }}
          className="glass-panel w-full max-w-md rounded-[2rem] p-6 sm:p-8"
        >
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
              <Lightbulb className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-950">BankIde</span>
          </div>
          {children}
        </motion.div>
      </section>
    </div>
  );
}
