import { useEffect, useState } from 'react';
import { CalendarClock, LoaderCircle, X } from 'lucide-react';
import { api } from '../lib/api';
import { CATEGORY_SUGGESTIONS, STATUS_META, STATUS_ORDER } from '../lib/constants';
import { toWibInput, wibInputToIso } from '../lib/dates';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

export default function IdeaFormModal({ idea, categories = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    title: idea?.title || '',
    category: idea?.category || '',
    context: idea?.context || '',
    v1Features: idea?.v1Features || '',
    solution: idea?.solution || '',
    agencyPrompt: idea?.agencyPrompt || '',
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-form-title"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="idea-form-title" className="text-lg font-semibold text-slate-900">
              {idea ? 'Edit Ide' : 'Ide Baru'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Simpan konteks dan langkah awal agar ide tidak berhenti sebagai catatan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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

          <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan Ide'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
