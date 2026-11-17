import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarClock,
  ExternalLink,
  LayoutList,
  Link2,
  Pencil,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { STATUS_META } from '../lib/constants';
import { formatDateTime, isOverdue } from '../lib/dates';
import IdeaMonitoringPanel from './IdeaMonitoringPanel';

const SECTIONS = [
  { key: 'context', label: 'Konteks / masalah' },
  { key: 'v1Features', label: 'Fitur V1' },
  { key: 'solution', label: 'Solusi' },
  { key: 'agencyPrompt', label: 'Agency prompt' },
];

export default function IdeaDetailModal({ idea, onClose, onEdit, onIdeaUpdated }) {
  const [tab, setTab] = useState('ringkasan');

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

  useEffect(() => {
    setTab('ringkasan');
  }, [idea.id]);

  const status = STATUS_META[idea.status] || STATUS_META.idea;
  const overdue = isOverdue(idea.reminderAt);

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
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl sm:rounded-3xl ${tab === 'monitoring' ? 'max-w-4xl' : 'max-w-2xl'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-detail-title"
      >
        <header className="relative overflow-hidden border-b border-white/70 bg-white/70 px-5 py-4">
          <div className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="idea-detail-title" className="text-lg font-semibold tracking-tight text-slate-950">
                {idea.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-indigo-100/80 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
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
          </div>
        </header>

        <div className="relative flex gap-1 border-b border-white/70 px-5 pt-2">
          <button
            type="button"
            onClick={() => setTab('ringkasan')}
            aria-pressed={tab === 'ringkasan'}
            className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold transition ${
              tab === 'ringkasan' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutList className="h-4 w-4" />
            Ringkasan
            {tab === 'ringkasan' && (
              <motion.span
                layoutId="detail-tab-indicator"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-600"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('monitoring')}
            aria-pressed={tab === 'monitoring'}
            className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold transition ${
              tab === 'monitoring' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Activity className="h-4 w-4" />
            Monitoring
            {tab === 'monitoring' && (
              <motion.span
                layoutId="detail-tab-indicator"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-600"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        </div>

        {tab === 'ringkasan' ? (
          <motion.div
            key="ringkasan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="scrollbar-slim flex-1 space-y-5 overflow-y-auto px-5 py-5"
          >
            {SECTIONS.map((section) => (
              <section key={section.key} className="rounded-2xl border border-white/70 bg-white/60 p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
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

            <section className="rounded-2xl border border-white/70 bg-white/60 p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Link demo
              </h3>
              {idea.demoUrl ? (
                <a
                  href={idea.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  <Link2 className="h-4 w-4 shrink-0" />
                  {idea.demoUrl}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <p className="mt-1.5 text-sm text-slate-400">Belum diisi.</p>
              )}
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="monitoring"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="scrollbar-slim flex-1 overflow-y-auto px-5 py-5"
          >
            <IdeaMonitoringPanel idea={idea} onIdeaUpdated={onIdeaUpdated} />
          </motion.div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-white/70 bg-white/60 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Tutup
          </button>
          <motion.button
            type="button"
            onClick={onEdit}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/25 transition hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
            Edit Ide
          </motion.button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
