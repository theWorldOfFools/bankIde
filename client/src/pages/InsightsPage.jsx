import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  Clock4,
  Flame,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { STATUS_META } from '../lib/constants';
import { formatDateTime } from '../lib/dates';
import PageHeader from '../components/PageHeader';
import TiltCard from '../components/TiltCard';

const PERIODS = [
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari' },
  { value: 90, label: '90 hari' },
];

const PRIORITY_META = {
  high: {
    label: 'Prioritas tinggi',
    className: 'border-rose-200/80 bg-rose-50 text-rose-700',
  },
  medium: {
    label: 'Prioritas sedang',
    className: 'border-amber-200/80 bg-amber-50 text-amber-700',
  },
  low: {
    label: 'Prioritas rendah',
    className: 'border-slate-200/80 bg-slate-50 text-slate-600',
  },
};

function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="insight-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="55%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f0abfc" />
          </linearGradient>
        </defs>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="10"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#insight-score-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-bold tracking-tight text-white">{score}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">dari 100</p>
        </div>
      </div>
    </div>
  );
}

function SubscoreCard({ icon: Icon, label, value, hint, tone, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <TiltCard intensity={5} lift={4} className="surface-card h-full rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ring-inset ${tone}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-2xl font-semibold tracking-tight text-slate-950">{value}</span>
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.8, delay: 0.15 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{hint}</p>
      </TiltCard>
    </motion.div>
  );
}

function ProjectRecommendation({ project, index }) {
  const priority = PRIORITY_META[project.priority] || PRIORITY_META.medium;
  const status = STATUS_META[project.status] || STATUS_META.idea;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <TiltCard intensity={5} lift={4} className="h-full">
        <article className="flex h-full flex-col rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm transition hover:shadow-xl hover:shadow-indigo-500/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${priority.className}`}>
              {priority.label}
            </span>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${status.className}`}>
              {status.label}
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-base font-semibold tracking-tight text-slate-950">
            {project.title}
          </h3>
          <p className="mt-1 text-xs font-medium text-indigo-600">{project.category}</p>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{project.reason}</p>

          <div className="mt-4 rounded-2xl border border-indigo-100/70 bg-indigo-50/70 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
              <Zap className="h-3.5 w-3.5" />
              Langkah berikutnya
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-indigo-950/80">{project.nextAction}</p>
          </div>

          <Link
            to={`/ideas?focus=${project.ideaId}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
          >
            Buka ide
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </TiltCard>
    </motion.div>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-72 animate-pulse rounded-[2rem] bg-white/60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-44 animate-pulse rounded-3xl bg-white/60" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-72 animate-pulse rounded-3xl bg-white/60" />
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [period, setPeriod] = useState(30);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [notice, setNotice] = useState('');

  const loadReport = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const payload = await api(`/insights?period=${period}`, { signal });
      setReport(payload);
      setWarning(payload.warning || '');
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    loadReport(controller.signal);
    return () => controller.abort();
  }, [loadReport]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError('');
    setNotice('');
    setWarning('');
    try {
      const payload = await api('/insights/analyze', {
        method: 'POST',
        body: JSON.stringify({ period }),
      });
      setReport(payload);
      setWarning(payload.warning || '');
      if (!payload.warning) {
        setNotice('Analisis AI berhasil diperbarui.');
      }
    } catch (analyzeError) {
      setError(analyzeError.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const metrics = report?.metrics;
  const activity = metrics?.activity;
  const tasks = metrics?.tasks;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Laporan Produktivitas"
        title={(
          <>
            Insight <span className="text-gradient">Produktivitas</span>
          </>
        )}
        description="Nilai ritme eksekusi, konsistensi, dan momentum proyek. AI merangkum prioritas serta proyek yang paling layak diselesaikan lebih dulu."
        icon={BrainCircuit}
        actions={(
          <>
            <div className="inline-flex rounded-2xl border border-white/70 bg-white/75 p-1 shadow-sm backdrop-blur">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`relative rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    period === item.value ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {period === item.value && (
                    <motion.span
                      layoutId="insight-period-active"
                      className="absolute inset-0 rounded-xl bg-slate-950 shadow-lg shadow-slate-900/25"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => loadReport()}
              disabled={loading}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/70 bg-white/75 text-slate-500 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
              aria-label="Muat ulang insight"
              title="Muat ulang insight"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || !report?.aiAvailable}
              title={report?.aiAvailable ? 'Analisis ulang dengan AI' : 'AI belum dikonfigurasi'}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {analyzing ? 'Menganalisis...' : 'Analisis AI'}
            </button>
          </>
        )}
      />

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-sm"
        >
          {notice}
        </motion.div>
      )}

      {warning && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {warning}
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadReport()}
            className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-rose-700 hover:text-rose-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <InsightSkeleton />
      ) : !report ? (
        <div className="surface-card rounded-3xl p-8 text-center text-sm text-slate-500">
          Insight belum tersedia.
        </div>
      ) : metrics?.total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/80 bg-white/60 px-6 py-20 text-center backdrop-blur">
          <motion.span
            initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-2xl shadow-indigo-500/25"
          >
            <Lightbulb className="h-7 w-7" />
          </motion.span>
          <h2 className="mt-5 text-lg font-semibold text-slate-950">Belum ada data untuk dianalisis</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Tambahkan ide, catat progres harian, dan kelola task. Setelah ada aktivitas, insight
            produktivitas akan muncul di sini.
          </p>
          <Link
            to="/ideas?new=1"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Lightbulb className="h-4 w-4" />
            Tambah Ide
          </Link>
        </div>
      ) : (
        <>
          {!report.aiAvailable && (
            <div className="rounded-2xl border border-indigo-100/80 bg-indigo-50/70 px-4 py-3 text-xs leading-relaxed text-indigo-800 shadow-sm">
              <strong className="font-semibold">AI belum dikonfigurasi.</strong>{' '}
              Insight saat ini dihitung dari metrik lokal. Isi <code className="rounded bg-white/70 px-1 py-0.5">AI_API_KEY</code> dan{' '}
              <code className="rounded bg-white/70 px-1 py-0.5">AI_MODEL</code> untuk mengaktifkan analisis naratif AI.
            </div>
          )}

          {report.aiAvailable && report.source === 'local' && (
            <div className="rounded-2xl border border-indigo-100/80 bg-indigo-50/70 px-4 py-3 text-xs leading-relaxed text-indigo-800 shadow-sm">
              Insight cepat ini dihitung dari metrik lokal. Tekan{' '}
              <strong className="font-semibold">Analisis AI</strong> untuk mendapatkan ringkasan,
              prioritas proyek, dan rencana aksi yang dipersonalisasi.
            </div>
          )}

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/30 sm:p-7"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_92%_0%,rgba(217,70,239,0.35),transparent_62%),radial-gradient(500px_380px_at_0%_100%,rgba(99,102,241,0.35),transparent_60%)]" />
            <div className="relative grid gap-7 lg:grid-cols-[auto_1fr] lg:items-center">
              <div className="flex items-center gap-5">
                <ScoreRing score={report.score} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/70">
                    Skor Produktivitas
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{report.scoreLabel}</p>
                  <span className="mt-2 inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    {report.source === 'ai' ? 'Analisis AI' : 'Metrik lokal'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Ringkasan {period} hari terakhir
                </p>
                <p className="mt-2 text-sm leading-relaxed text-indigo-50/85 sm:text-base">
                  {report.summary}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-white/50">{report.encouragement}</p>
              </div>
            </div>

            <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Proyek aktif', value: metrics.active, icon: Flame },
                { label: 'Task selesai', value: `${tasks.done}/${tasks.total}`, icon: CheckCircle2 },
                { label: 'Hari aktif', value: `${activity.activeDays}/${period}`, icon: CalendarCheck2 },
                { label: 'Hari blocker', value: activity.blockerDays, icon: AlertTriangle },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur"
                  >
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                      <Icon className="h-3.5 w-3.5" />
                      {stat.label}
                    </span>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-white">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          </motion.section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SubscoreCard
              icon={Zap}
              label="Eksekusi"
              value={report.subscores.execution}
              hint={`${tasks.done} dari ${tasks.total} task selesai`}
              tone="bg-amber-50 text-amber-600 ring-amber-100"
              index={0}
            />
            <SubscoreCard
              icon={CalendarCheck2}
              label="Konsistensi"
              value={report.subscores.consistency}
              hint={`${activity.activeDays} hari aktif dalam ${period} hari`}
              tone="bg-sky-50 text-sky-600 ring-sky-100"
              index={1}
            />
            <SubscoreCard
              icon={Target}
              label="Penyelesaian"
              value={report.subscores.completion}
              hint={`${metrics.done} ide selesai dari pipeline`}
              tone="bg-emerald-50 text-emerald-600 ring-emerald-100"
              index={2}
            />
            <SubscoreCard
              icon={TrendingUp}
              label="Momentum"
              value={report.subscores.momentum}
              hint={`${activity.last7Days} hari aktif vs ${activity.previous7Days} pekan lalu`}
              tone="bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100"
              index={3}
            />
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Proyek yang disarankan selesai
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Dipilih dari status, progres task, checklist, dan aktivitas terakhir.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {report.recommendedProjects.length} prioritas teratas
              </span>
            </div>

            {report.recommendedProjects.length === 0 ? (
              <div className="surface-card rounded-3xl p-6 text-sm text-slate-500">
                Belum ada proyek aktif. Ubah status ide menjadi Direncanakan atau Dikerjakan agar
                bisa direkomendasikan.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {report.recommendedProjects.map((project, index) => (
                  <ProjectRecommendation key={project.ideaId} project={project} index={index} />
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="surface-card rounded-3xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <h2 className="font-semibold tracking-tight text-slate-950">Yang berjalan baik</h2>
              </div>
              <ul className="mt-4 space-y-2.5">
                {report.strengths.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="surface-card rounded-3xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <h2 className="font-semibold tracking-tight text-slate-950">Risiko & hambatan</h2>
              </div>
              <ul className="mt-4 space-y-2.5">
                {report.risks.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </section>

          <section className="surface-card rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold tracking-tight text-slate-950">Rencana aksi</h2>
                <p className="text-xs text-slate-400">Langkah konkret untuk periode berikutnya.</p>
              </div>
            </div>
            <ol className="mt-5 grid gap-3 sm:grid-cols-2">
              {report.actionPlan.map((item, index) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/60 p-3.5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-600">{item}</p>
                </li>
              ))}
            </ol>

            {report.recentBlockers.length > 0 && (
              <div className="mt-5 border-t border-white/70 pt-5">
                <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <Clock4 className="h-3.5 w-3.5" />
                  Blocker terbaru
                </h3>
                <ul className="mt-3 space-y-2">
                  {report.recentBlockers.map((blocker) => (
                    <li
                      key={`${blocker.ideaId}-${blocker.date}`}
                      className="rounded-2xl border border-rose-100/80 bg-rose-50/60 px-3.5 py-2.5"
                    >
                      <p className="text-xs font-semibold text-rose-800">
                        {blocker.title}
                        <span className="ml-2 font-normal text-rose-500">{blocker.date}</span>
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-rose-700/80">{blocker.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <p className="flex flex-col gap-1 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Dibuat {formatDateTime(report.generatedAt)} · Skor dihitung dari eksekusi,
              konsistensi, penyelesaian, dan momentum.
            </span>
            <span>Insight bersifat saran, bukan penilaian mutlak.</span>
          </p>
        </>
      )}
    </div>
  );
}
