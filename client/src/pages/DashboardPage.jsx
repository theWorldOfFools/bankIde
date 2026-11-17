import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { STATUS_META, STATUS_ORDER } from '../lib/constants';
import { formatDateTime, isOverdue } from '../lib/dates';
import PageHeader from '../components/PageHeader';
import PushToggle from '../components/PushToggle';
import TiltCard from '../components/TiltCard';

const STAT_TONES = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
};

function StatCard({ icon: Icon, label, value, hint, tone, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <TiltCard className="surface-card card-shine rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ring-inset ${STAT_TONES[tone] || STAT_TONES.indigo}`}>
            <Icon className="h-4.5 w-4.5" />
          </span>
          <TrendingUp className="h-4 w-4 text-slate-200" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      </TiltCard>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-3xl bg-white/60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-3xl bg-white/60" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-96 animate-pulse rounded-3xl bg-white/60 xl:col-span-2" />
        <div className="h-96 animate-pulse rounded-3xl bg-white/60" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api('/dashboard'));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="surface-card rounded-3xl p-8 text-center">
        <p className="text-sm text-rose-600">{error || 'Dashboard tidak tersedia.'}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Coba lagi
        </button>
      </div>
    );
  }

  const { stats, categories, statuses, reminders, recentIdeas, recommendations } = data;
  const statusCounts = Object.fromEntries(
    (statuses || []).map((item) => [item.status, item.count])
  );
  const maxCategory = Math.max(1, ...(categories || []).map((item) => item.count));
  const latestRecommendation = recommendations?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={(
          <>
            Selamat datang di <span className="text-gradient">BankIde</span>
          </>
        )}
        description="Pantau ide, pipeline, dan pengingat dari satu workspace yang rapi."
        icon={LayoutDashboard}
        actions={(
          <>
            <PushToggle />
            <Link
              to="/ideas?new=1"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Ide Baru
            </Link>
          </>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Lightbulb}
          label="Total Ide"
          value={stats.totalIdeas}
          hint="Seluruh ide yang tersimpan"
          tone="indigo"
          index={0}
        />
        <StatCard
          icon={Sparkles}
          label="Kategori Terpopuler"
          value={stats.topCategory || 'Belum ada'}
          hint="Berdasarkan jumlah ide"
          tone="fuchsia"
          index={1}
        />
        <StatCard
          icon={FolderKanban}
          label="Proyek Aktif"
          value={stats.activeProjects}
          hint="Direncanakan dan dikerjakan"
          tone="sky"
          index={2}
        />
        <StatCard
          icon={BellRing}
          label="Pengingat Aktif"
          value={stats.activeReminders}
          hint="Belum selesai atau diarsipkan"
          tone="amber"
          index={3}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="surface-card rounded-3xl p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Kategori Teratas</h2>
                <p className="mt-0.5 text-xs text-slate-400">Enam kategori dengan ide terbanyak.</p>
              </div>
              <Link
                to="/ideas"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Kelola ide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {categories.length === 0 ? (
                <p className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-500">
                  Belum ada kategori. Tambahkan ide pertama untuk mulai mengisi dashboard.
                </p>
              ) : categories.map((item, index) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700">{item.category}</span>
                    <span className="shrink-0 text-xs text-slate-400">{item.count} ide</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100/90">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(8, (item.count / maxCategory) * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.15 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="surface-card rounded-3xl p-5 sm:p-6"
          >
            <h2 className="font-semibold text-slate-950">Status Pipeline</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {STATUS_ORDER.map((status, index) => {
                const meta = STATUS_META[status];
                return (
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + index * 0.05, duration: 0.35 }}
                    whileHover={{ y: -3 }}
                    className="rounded-2xl border border-white/70 bg-white/60 p-3.5 shadow-sm"
                  >
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}>
                      {meta.label}
                    </span>
                    <p className="mt-2.5 text-2xl font-semibold text-slate-950">
                      {statusCounts[status] || 0}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.45 }}
            className="surface-card rounded-3xl p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Ide Terbaru</h2>
                <p className="mt-0.5 text-xs text-slate-400">Lima ide terakhir yang masuk.</p>
              </div>
              <Link to="/ideas" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                Lihat semua
              </Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {recentIdeas.length === 0 ? (
                <p className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-500">
                  Belum ada ide. Mulai dari halaman Daftar Ide.
                </p>
              ) : recentIdeas.map((idea) => (
                <Link
                  key={idea.id}
                  to={`/ideas?focus=${idea.id}`}
                  className="group flex items-center justify-between gap-4 py-3.5 transition hover:text-indigo-600"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                      {idea.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{idea.category}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_META[idea.status]?.className || STATUS_META.idea.className}`}>
                    {STATUS_META[idea.status]?.label || idea.status}
                  </span>
                </Link>
              ))}
            </div>
          </motion.section>
        </div>

        <aside className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
            className="surface-card rounded-3xl p-5 sm:p-6"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <BellRing className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-950">Pengingat Aktif</h2>
            </div>
            <div className="mt-4 space-y-3">
              {reminders.length === 0 ? (
                <p className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-500">
                  Belum ada pengingat aktif. Atur tanggal saat membuat atau mengedit ide.
                </p>
              ) : reminders.map((reminder) => {
                const overdue = isOverdue(reminder.reminderAt);
                return (
                  <Link
                    key={reminder.id}
                    to={`/ideas?focus=${reminder.id}`}
                    className="block rounded-2xl border border-white/70 bg-white/60 p-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5"
                  >
                    <p className="line-clamp-1 text-sm font-semibold text-slate-800">
                      {reminder.title}
                    </p>
                    <p className={`mt-1 flex flex-wrap items-center gap-1 text-xs ${overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                      <BellRing className="h-3 w-3" />
                      {formatDateTime(reminder.reminderAt)}
                      {overdue && <span className="font-semibold">- Terlambat</span>}
                    </p>
                  </Link>
                );
              })}
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.45 }}
          >
            <TiltCard className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/30 sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(500px_300px_at_90%_0%,rgba(217,70,239,0.4),transparent_65%),radial-gradient(400px_300px_at_0%_100%,rgba(99,102,241,0.38),transparent_60%)]" />
              <div className="relative">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">Butuh ide baru?</h2>
                <p className="mt-1 text-sm leading-relaxed text-indigo-100/75">
                  Minta rekomendasi sesuai kategori, atau gunakan kurasi lokal tanpa API key.
                </p>
                {latestRecommendation && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 backdrop-blur">
                    <p className="line-clamp-1 text-sm font-medium">{latestRecommendation.title}</p>
                    <p className="mt-1 text-xs text-indigo-100/60">
                      Skor potensi {latestRecommendation.potentialScore}/100
                    </p>
                  </div>
                )}
                <Link
                  to="/recommendations"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white"
                >
                  Jelajahi rekomendasi
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </TiltCard>
          </motion.div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          {loading && data && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <LoaderCircle className="h-3 w-3 animate-spin" />
              Memperbarui data...
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}
