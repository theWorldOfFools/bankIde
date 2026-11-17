import { useEffect, useState } from 'react';
import { CalendarClock, LoaderCircle, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { CATEGORY_SUGGESTIONS, STATUS_META, STATUS_ORDER } from '../lib/constants';
import { toWibInput, wibInputToIso } from '../lib/dates';

const inputClass = 'w-full rounded-2xl border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/70';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400';

export default function IdeaFormModal({ idea, categories = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    title: idea?.title || '',
    category: idea?.category || '',
    context: idea?.context || '',
    v1Features: idea?.v1Features || '',
    solution: idea?.solution || '',
    agencyPrompt: idea?.agencyPrompt || '',
    demoUrl: idea?.demoUrl || '',
    status: idea?.status || 'idea',
    reminderAt: toWibInput(idea?.reminderAt),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        context: form.context,
        v1Features: form.v1Features,
        solution: form.solution,
        agencyPrompt: form.agencyPrompt,
        demoUrl: form.demoUrl.trim(),
        status: form.status,
        reminderAt: wibInputToIso(form.reminderAt),
      };

      await api(idea ? `/ideas/${idea.id}` : '/ideas', {
        method: idea ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      onSaved(idea ? 'Ide berhasil diperbarui.' : 'Ide baru berhasil disimpan.');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  const allCategories = [...new Set([...CATEGORY_SUGGESTIONS, ...categories])];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.97, rotateX: 7 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        exit={{ opacity: 0, y: 32, scale: 0.97, rotateX: 7 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{ transformPerspective: 1200 }}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-form-title"
      >
        <header className="relative flex items-center justify-between gap-4 border-b border-white/70 bg-white/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 id="idea-form-title" className="text-lg font-semibold tracking-tight text-slate-950">
                {idea ? 'Edit Ide' : 'Ide Baru'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Simpan konteks dan langkah awal agar ide tidak berhenti sebagai catatan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-slim flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {error && (
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Judul ide *</span>
                <input
                  autoFocus
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) => update('title', event.target.value)}
                  className={inputClass}
                  placeholder="Contoh: Invoice Radar"
                />
              </label>

              <label>
                <span className={labelClass}>Kategori *</span>
                <input
                  required
                  list="bankide-category-options"
                  maxLength={80}
                  value={form.category}
                  onChange={(event) => update('category', event.target.value)}
                  className={inputClass}
                  placeholder="SaaS Mikro"
                />
                <datalist id="bankide-category-options">
                  {allCategories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Status</span>
                <select
                  value={form.status}
                  onChange={(event) => update('status', event.target.value)}
                  className={inputClass}
                >
                  {STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Pengingat (WIB)</span>
                <span className="relative block">
                  <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={form.reminderAt}
                    onChange={(event) => update('reminderAt', event.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </span>
              </label>
            </div>

            <label>
              <span className={labelClass}>Link demo</span>
              <input
                type="url"
                maxLength={2000}
                value={form.demoUrl}
                onChange={(event) => update('demoUrl', event.target.value)}
                className={inputClass}
                placeholder="https://demo.example.com"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Opsional. URL demo atau staging yang bisa dibuka dari detail ide.
              </span>
            </label>

            <label>
              <span className={labelClass}>Konteks / masalah</span>
              <textarea
                rows={3}
                maxLength={10000}
                value={form.context}
                onChange={(event) => update('context', event.target.value)}
                className={inputClass}
                placeholder="Siapa yang mengalami masalah ini dan mengapa penting?"
              />
            </label>

            <label>
              <span className={labelClass}>Fitur V1</span>
              <textarea
                rows={3}
                maxLength={10000}
                value={form.v1Features}
                onChange={(event) => update('v1Features', event.target.value)}
                className={inputClass}
                placeholder="Fitur minimum yang harus ada pada versi pertama."
              />
            </label>

            <label>
              <span className={labelClass}>Solusi</span>
              <textarea
                rows={3}
                maxLength={10000}
                value={form.solution}
                onChange={(event) => update('solution', event.target.value)}
                className={inputClass}
                placeholder="Pendekatan produk atau teknologi yang diajukan."
              />
            </label>

            <label>
              <span className={labelClass}>Agency prompt</span>
              <textarea
                rows={3}
                maxLength={10000}
                value={form.agencyPrompt}
                onChange={(event) => update('agencyPrompt', event.target.value)}
                className={inputClass}
                placeholder="Prompt siap pakai untuk agen AI saat mulai mengeksekusi ide ini."
              />
            </label>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-white/70 bg-white/60 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Batal
            </button>
            <motion.button
              type="submit"
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/25 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan Ide'}
            </motion.button>
          </footer>
        </form>
      </motion.div>
    </motion.div>
  );
}
