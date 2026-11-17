import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Lightbulb,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { CATEGORY_SUGGESTIONS } from '../lib/constants';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import TiltCard from '../components/TiltCard';

const PAGE_SIZE_OPTIONS = [9, 12, 24];
const DEFAULT_PAGE_SIZE = 9;

const inputClass = 'w-full rounded-2xl border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/70';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400';

function RecommendationCard({ item, index, isSaved, savingId, onSave, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index, 8) * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="h-full"
    >
      <TiltCard intensity={5} lift={4} className="h-full">
        <article
          className={`flex h-full flex-col rounded-3xl border p-5 shadow-sm transition hover:shadow-xl hover:shadow-indigo-500/10 ${
            compact
              ? 'border-indigo-100/80 bg-white/90'
              : 'border-white/80 bg-white/85'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex rounded-full border border-indigo-100/80 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
              {item.category}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                item.source === 'ai'
                  ? 'bg-violet-50 text-violet-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {item.source === 'ai' ? <Sparkles className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {item.source === 'ai' ? 'AI' : 'Kurasi'}
            </span>
          </div>

          <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-950">{item.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
            {item.description}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/70 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, item.potentialScore || 0))}%` }}
                  transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                />
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-500">
                {item.potentialScore}/100
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onSave(item)}
              disabled={isSaved || savingId === item.id}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/70 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-default disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700"
            >
              {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {isSaved ? 'Tersimpan' : savingId === item.id ? 'Menyimpan...' : 'Simpan ide'}
            </motion.button>
          </div>
        </article>
      </TiltCard>
    </motion.div>
  );
}

export default function RecommendationsPage() {
  const [category, setCategory] = useState('AI & Produktivitas');
  const [context, setContext] = useState('');
  const [count, setCount] = useState('6');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const stored = Number(localStorage.getItem('bankide.recommendationsPageSize'));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const [generatedItems, setGeneratedItems] = useState([]);
  const [source, setSource] = useState(null);
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [notice, setNotice] = useState('');

  const loadExisting = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      const payload = await api(`/recommendations?${query.toString()}`);
      if (payload.meta?.totalPages > 0 && page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }
      setItems(payload.items || []);
      if (payload.meta) setMeta(payload.meta);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  function changePageSize(size) {
    setPageSize(size);
    setPage(1);
    localStorage.setItem('bankide.recommendationsPageSize', String(size));
  }

  async function handleGenerate(event) {
    event.preventDefault();
    setGenerating(true);
    setError('');
    setWarning('');
    setNotice('');
    setSavedIds([]);

    try {
      const payload = await api('/recommendations/generate', {
        method: 'POST',
        body: JSON.stringify({
          category: category.trim(),
          context: context.trim(),
          count: Number(count),
        }),
      });
      setGeneratedItems(payload.items || []);
      setSource(payload.source);
      setWarning(payload.warning || '');
      if (page !== 1) {
        setPage(1);
      } else {
        await loadExisting();
      }
    } catch (generateError) {
      setError(generateError.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAsIdea(item) {
    setSavingId(item.id);
    setNotice('');
    try {
      await api(`/recommendations/${item.id}/save`, {
        method: 'POST',
      });
      setSavedIds((current) => [...current, item.id]);
      setNotice(`"${item.title}" disimpan ke daftar ide.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Idea Engine"
        title={(
          <>
            Rekomendasi <span className="text-gradient">Ide</span>
          </>
        )}
        description="Hasilkan peluang baru berdasarkan kategori. AI bersifat opsional; fallback kurasi tetap dapat digunakan tanpa API key."
        icon={Sparkles}
        actions={(
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            {source === 'ai' ? 'AI aktif' : source === 'curated' ? 'Kurasi lokal' : 'Siap digunakan'}
          </div>
        )}
      />

      <form onSubmit={handleGenerate} className="surface-card rounded-3xl p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr_0.7fr_auto] lg:items-end">
          <label>
            <span className={labelClass}>Kategori</span>
            <input
              required
              list="recommendation-categories"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
              placeholder="SaaS Mikro"
            />
            <datalist id="recommendation-categories">
              {CATEGORY_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label>
            <span className={labelClass}>Konteks tambahan</span>
            <input
              value={context}
              onChange={(event) => setContext(event.target.value)}
              maxLength={1000}
              className={inputClass}
              placeholder="Contoh: target UMKM kuliner di kota tier 2"
            />
          </label>

          <label>
            <span className={labelClass}>Jumlah</span>
            <select
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className={inputClass}
            >
              <option value="4">4 ide</option>
              <option value="6">6 ide</option>
              <option value="8">8 ide</option>
            </select>
          </label>

          <motion.button
            type="submit"
            disabled={generating}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/25 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
          >
            {generating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            {generating ? 'Menghasilkan...' : 'Generate'}
          </motion.button>
        </div>
      </form>

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
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {generatedItems.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2rem] border border-indigo-100/80 bg-gradient-to-br from-indigo-50/80 via-white/60 to-fuchsia-50/70 p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
                <WandSparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold tracking-tight text-slate-950">Hasil generate</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {generatedItems.length} rekomendasi baru untuk kategori {category}.
                </p>
              </div>
            </div>
            <span className="inline-flex self-start rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-[11px] font-semibold text-indigo-700 sm:self-auto">
              {source === 'ai' ? 'AI' : 'Kurasi lokal'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {generatedItems.map((item, index) => (
              <RecommendationCard
                key={`generated-${item.id}`}
                item={item}
                index={index}
                compact
                isSaved={savedIds.includes(item.id)}
                savingId={savingId}
                onSave={handleSaveAsIdea}
              />
            ))}
          </div>
        </motion.section>
      )}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold tracking-tight text-slate-950">Katalog Rekomendasi</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {meta.total} ide tersimpan di database.
            </p>
          </div>
          <button
            type="button"
            onClick={loadExisting}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur transition hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Muat ulang
          </button>
        </div>

        {loading ? (
          <div className="surface-card flex flex-col items-center justify-center gap-3 rounded-3xl py-24 text-sm text-slate-400">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
            </span>
            Memuat rekomendasi...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/80 bg-white/60 px-6 py-20 text-center backdrop-blur">
            <motion.span
              initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-2xl shadow-indigo-500/25"
            >
              <Lightbulb className="h-7 w-7" />
            </motion.span>
            <h3 className="mt-5 text-lg font-semibold text-slate-950">Belum ada rekomendasi</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Pilih kategori lalu tekan Generate untuk mulai mengisi katalog.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <RecommendationCard
                key={item.id}
                item={item}
                index={index}
                isSaved={savedIds.includes(item.id)}
                savingId={savingId}
                onSave={handleSaveAsIdea}
              />
            ))}
          </div>
        )}

        <div className="surface-card mt-4 rounded-2xl px-4 py-3.5">
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            pageSize={pageSize}
            onPageChange={setPage}
            label="rekomendasi"
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={changePageSize}
          />
        </div>
      </section>
    </div>
  );
}
