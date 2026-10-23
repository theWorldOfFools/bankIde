import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  FolderKanban,
  Lightbulb,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { STATUS_META, STATUS_ORDER } from '../lib/constants';
import { formatDateTime, isOverdue } from '../lib/dates';
import PushToggle from '../components/PushToggle';

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70 xl:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
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
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-rose-600">{error || 'Dashboard tidak tersedia.'}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Selamat datang di BankIde
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pantau ide, pipeline, dan pengingat dari satu tempat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PushToggle />
          <Link
            to="/ideas?new=1"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Ide Baru
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Lightbulb}
          label="Total Ide"
          value={stats.totalIdeas}
          hint="Seluruh ide yang tersimpan"
        />
        <StatCard
          icon={Sparkles}
          label="Kategori Terpopuler"
          value={stats.topCategory || 'Belum ada'}
          hint="Berdasarkan jumlah ide"
        />
        <StatCard
          icon={FolderKanban}
          label="Proyek Aktif"
          value={stats.activeProjects}
          hint="Direncanakan dan dikerjakan"
        />
        <StatCard
          icon={BellRing}
          label="Pengingat Aktif"
          value={stats.activeReminders}
          hint="Belum selesai atau diarsipkan"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Kategori Teratas</h2>
                <p className="mt-0.5 text-xs text-slate-400">Enam kategori dengan ide terbanyak.</p>
              </div>
              <Link
                to="/ideas"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Kelola ide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {categories.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada kategori. Tambahkan ide pertama untuk mulai mengisi dashboard.
                </p>
              ) : categories.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700">{item.category}</span>
                    <span className="shrink-0 text-slate-400">{item.count} ide</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.max(8, (item.count / maxCategory) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-slate-900">Status Pipeline</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {STATUS_ORDER.map((status) => {
                const meta = STATUS_META[status];
                return (
                  <div key={status} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                      {meta.label}
                    </span>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {statusCounts[status] || 0}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Ide Terbaru</h2>
              <Link to="/ideas" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Lihat semua
              </Link>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {recentIdeas.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada ide. Mulai dari halaman Daftar Ide.
                </p>
              ) : recentIdeas.map((idea) => (
                <Link
                  key={idea.id}
                  to={`/ideas?focus=${idea.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition hover:text-indigo-600"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{idea.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{idea.category}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_META[idea.status]?.className || STATUS_META.idea.className}`}>
                    {STATUS_META[idea.status]?.label || idea.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Pengingat Aktif</h2>
            </div>
            <div className="mt-4 space-y-3">
              {reminders.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada pengingat aktif. Atur tanggal saat membuat atau mengedit ide.
                </p>
              ) : reminders.map((reminder) => {
                const overdue = isOverdue(reminder.reminderAt);
                return (
                  <Link
                    key={reminder.id}
                    to={`/ideas?focus=${reminder.id}`}
                    className="block rounded-xl border border-slate-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-slate-800">
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
          </section>

          <section className="rounded-2xl bg-indigo-600 p-5 text-white shadow-sm sm:p-6">
            <Sparkles className="h-5 w-5" />
            <h2 className="mt-3 text-lg font-semibold">Butuh ide baru?</h2>
            <p className="mt-1 text-sm leading-relaxed text-indigo-100">
              Minta rekomendasi sesuai kategori, atau gunakan kurasi lokal tanpa API key.
            </p>
            {latestRecommendation && (
              <div className="mt-4 rounded-xl bg-white/10 p-3">
                <p className="line-clamp-1 text-sm font-medium">{latestRecommendation.title}</p>
                <p className="mt-1 text-xs text-indigo-100">
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
          </section>

          {error && (
            <p className="text-xs text-rose-500">{error}</p>
          )}

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
