import { useEffect } from 'react';
import { CalendarClock, Pencil, X } from 'lucide-react';
import { STATUS_META } from '../lib/constants';
import { formatDateTime, isOverdue } from '../lib/dates';

const SECTIONS = [
  { key: 'context', label: 'Konteks / masalah' },
  { key: 'v1Features', label: 'Fitur V1' },
  { key: 'solution', label: 'Solusi' },
  { key: 'agencyPrompt', label: 'Agency prompt' },
];

export default function IdeaDetailModal({ idea, onClose, onEdit }) {
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

  const status = STATUS_META[idea.status] || STATUS_META.idea;
  const overdue = isOverdue(idea.reminderAt);

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
        aria-labelledby="idea-detail-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="idea-detail-title" className="text-lg font-semibold text-slate-900">
              {idea.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {idea.category}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>
                {status.label}
              </span>
              {idea.reminderAt && (
                <span className={`inline-flex items-center gap-1 text-[11px] ${overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                  <CalendarClock className="h-3 w-3" />
                  {formatDateTime(idea.reminderAt)}
                </span>
              )}
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {SECTIONS.map((section) => (
            <section key={section.key}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </h3>
              {idea[section.key] ? (
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {idea[section.key]}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-slate-400">Belum diisi.</p>
              )}
            </section>
          ))}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Pencil className="h-4 w-4" />
            Edit Ide
          </button>
        </footer>
      </div>
    </div>
  );
}
