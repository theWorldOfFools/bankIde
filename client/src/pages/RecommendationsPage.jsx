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
import { api } from '../lib/api';
import { CATEGORY_SUGGESTIONS } from '../lib/constants';

export default function RecommendationsPage() {
  const [category, setCategory] = useState('AI & Produktivitas');
  const [context, setContext] = useState('');
  const [count, setCount] = useState('6');
  const [items, setItems] = useState([]);
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
      const payload = await api('/recommendations?limit=24');
      setItems(payload.items || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  async function handleGenerate(event) {
    event.preventDefault();
    setGenerating(true);
    setError('');
    setWarning('');
    setNotice('');

    try {
      const payload = await api('/recommendations/generate', {
        method: 'POST',
        body: JSON.stringify({
          category: category.trim(),
          context: context.trim(),
          count: Number(count),
        }),
      });
      setItems(payload.items || []);
      setSource(payload.source);
      setWarning(payload.warning || '');
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Idea Engine</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Rekomendasi Ide
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Hasilkan peluang baru berdasarkan kategori. AI bersifat opsional; fallback kurasi
            tetap dapat digunakan tanpa API key.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
          <Sparkles className="h-4 w-4" />
          {source === 'ai' ? 'AI aktif' : source === 'curated' ? 'Kurasi lokal' : 'Siap digunakan'}
        </div>
      </header>

      <form onSubmit={handleGenerate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr_0.7fr_auto] lg:items-end">
          <label>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Kategori</span>
            <input
              required
              list="recommendation-categories"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="SaaS Mikro"
            />
            <datalist id="recommendation-categories">
              {CATEGORY_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Konteks tambahan
            </span>
            <input
              value={context}
              onChange={(event) => setContext(event.target.value)}
              maxLength={1000}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="Contoh: target UMKM kuliner di kota tier 2"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Jumlah</span>
            <select
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
            >
              <option value="4">4 ide</option>
              <option value="6">6 ide</option>
              <option value="8">8 ide</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
          >
            {generating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            {generating ? 'Menghasilkan...' : 'Generate'}
          </button>
        </div>
      </form>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {warning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Katalog Rekomendasi</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {items.length} ide tersimpan di database.
            </p>
          </div>
          <button
            type="button"
            onClick={loadExisting}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <RefreshCw className="h-4 w-4" />
            Muat ulang
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat rekomendasi...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Lightbulb className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">Belum ada rekomendasi</h3>
            <p className="mt-1 text-sm text-slate-500">
              Pilih kategori lalu tekan Generate untuk mulai mengisi katalog.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const isSaved = savedIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {item.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.source === 'ai'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {item.source === 'ai' ? <Sparkles className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {item.source === 'ai' ? 'AI' : 'Kurasi'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                    {item.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${item.potentialScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {item.potentialScore}/100
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveAsIdea(item)}
                      disabled={isSaved || savingId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-default disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700"
                    >
                      {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {isSaved ? 'Tersimpan' : savingId === item.id ? 'Menyimpan...' : 'Simpan ide'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
