import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Link2,
  ListChecks,
  LoaderCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  formatWibDate,
  shiftWibDate,
  todayWibDate,
} from '../lib/dates';

const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'Belum dikerjakan' },
  { value: 'in_progress', label: 'Sedang dikerjakan' },
  { value: 'done', label: 'Selesai' },
];

const TASK_STATUS_RANK = {
  in_progress: 0,
  todo: 1,
  done: 2,
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const smallButtonClass = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    const rank = (TASK_STATUS_RANK[left.status] ?? 3) - (TASK_STATUS_RANK[right.status] ?? 3);
    if (rank !== 0) return rank;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function StatCard({ label, value, detail, icon: Icon, tone }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
        {detail && <p className="text-[11px] text-slate-400">{detail}</p>}
      </div>
    </div>
  );
}

export default function IdeaMonitoringPanel({ idea, onIdeaUpdated }) {
  const [date, setDate] = useState(todayWibDate);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');
  const [demoDraft, setDemoDraft] = useState(idea?.demoUrl || '');
  const [notes, setNotes] = useState('');
  const [blockers, setBlockers] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [newTaskDate, setNewTaskDate] = useState(date);
  const [attachmentTaskId, setAttachmentTaskId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const lastLoadedDateRef = useRef('');
  const today = todayWibDate();
  const loadedDate = data?.date || '';
  const loadedNotes = data?.day?.notes || '';
  const loadedBlockers = data?.day?.blockers || '';
  const loadedDemoUrl = data?.idea?.demoUrl || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);

    api(`/ideas/${idea.id}/monitoring?date=${encodeURIComponent(date)}`)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((loadError) => {
        if (active && loadError.status !== 401) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, idea.id, reloadToken]);

  useEffect(() => {
    if (!loadedDate || lastLoadedDateRef.current === loadedDate) return;
    lastLoadedDateRef.current = loadedDate;
    setNotes(loadedNotes);
    setBlockers(loadedBlockers);
    setDemoDraft(loadedDemoUrl);
    setNewTaskDate(loadedDate);
  }, [loadedDate, loadedNotes, loadedBlockers, loadedDemoUrl]);

  useEffect(() => {
    setDemoDraft(loadedDemoUrl);
  }, [loadedDemoUrl]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const checklistDone = useMemo(
    () => data?.checklist.filter((item) => item.isDone).length || 0,
    [data]
  );
  const taskDone = useMemo(
    () => data?.tasks.filter((task) => task.status === 'done').length || 0,
    [data]
  );
  const checklistProgress = data?.checklist.length
    ? Math.round((checklistDone / data.checklist.length) * 100)
    : 0;

  function fail(actionError) {
    if (actionError.status === 401) return;
    setNotice({ type: 'error', message: actionError.message });
  }

  function changeDate(nextDate) {
    if (!nextDate || nextDate === date) return;
    setDate(nextDate);
    setAttachmentTaskId('');
    setNotice(null);
  }

  async function saveDemo(event) {
    event.preventDefault();
    setBusy('demo');
    setNotice(null);

    try {
      const updated = await api(`/ideas/${idea.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ demoUrl: demoDraft.trim() }),
      });
      setData((current) => current ? {
        ...current,
        idea: { ...current.idea, demoUrl: updated.demoUrl },
      } : current);
      setDemoDraft(updated.demoUrl || '');
      onIdeaUpdated?.(updated);
      setNotice({ type: 'success', message: 'Link demo diperbarui.' });
    } catch (saveError) {
      fail(saveError);
    } finally {
      setBusy('');
    }
  }

  async function toggleChecklist(item) {
    setBusy(`check-${item.id}`);
    setNotice(null);

    try {
      const result = await api(`/ideas/${idea.id}/monitoring/checklist/${item.id}/check`, {
        method: 'PUT',
        body: JSON.stringify({ date, done: !item.isDone }),
      });
      setData((current) => current ? {
        ...current,
        checklist: current.checklist.map((entry) => (
          entry.id === item.id ? { ...entry, isDone: result.isDone } : entry
        )),
      } : current);
    } catch (toggleError) {
      fail(toggleError);
    } finally {
      setBusy('');
    }
  }

  async function addChecklist(event) {
    event.preventDefault();
    const label = newChecklist.trim();
    if (!label) return;

    setBusy('checklist-add');
    setNotice(null);

    try {
      const item = await api(`/ideas/${idea.id}/monitoring/checklist`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      setData((current) => current ? {
        ...current,
        checklist: [...current.checklist, item],
      } : current);
      setNewChecklist('');
    } catch (addError) {
      fail(addError);
    } finally {
      setBusy('');
    }
  }

  async function deleteChecklist(item) {
    const confirmed = window.confirm(
      `Hapus checklist "${item.label}"? Riwayat centang item ini di semua tanggal juga terhapus.`
    );
    if (!confirmed) return;

    setBusy(`checklist-delete-${item.id}`);
    setNotice(null);

    try {
      await api(`/ideas/${idea.id}/monitoring/checklist/${item.id}`, { method: 'DELETE' });
      setData((current) => current ? {
        ...current,
        checklist: current.checklist.filter((entry) => entry.id !== item.id),
      } : current);
    } catch (deleteError) {
      fail(deleteError);
    } finally {
      setBusy('');
    }
  }

  async function saveNotes() {
    setBusy('notes');
    setNotice(null);

    try {
      const day = await api(`/ideas/${idea.id}/monitoring/day`, {
        method: 'PUT',
        body: JSON.stringify({ date, notes, blockers }),
      });
      setData((current) => current ? { ...current, day } : current);
      setNotice({ type: 'success', message: 'Catatan harian disimpan.' });
    } catch (saveError) {
      fail(saveError);
    } finally {
      setBusy('');
    }
  }

  async function addTask(event) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    setBusy('task-add');
    setNotice(null);

    try {
      const task = await api(`/ideas/${idea.id}/monitoring/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          status: newTaskStatus,
          workedOn: newTaskDate || null,
        }),
      });
      setData((current) => current ? {
        ...current,
        tasks: sortTasks([task, ...current.tasks]),
      } : current);
      setNewTaskTitle('');
      setNewTaskStatus('todo');
    } catch (addError) {
      fail(addError);
    } finally {
      setBusy('');
    }
  }

  async function updateTaskStatus(task, status) {
    setBusy(`task-status-${task.id}`);
    setNotice(null);

    try {
      const updated = await api(`/ideas/${idea.id}/monitoring/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setData((current) => current ? {
        ...current,
        tasks: sortTasks(current.tasks.map((entry) => (
          entry.id === task.id ? updated : entry
        ))),
      } : current);
    } catch (updateError) {
      fail(updateError);
    } finally {
      setBusy('');
    }
  }

  async function deleteTask(task) {
    const confirmed = window.confirm(`Hapus task "${task.title}"?`);
    if (!confirmed) return;

    setBusy(`task-delete-${task.id}`);
    setNotice(null);

    try {
      await api(`/ideas/${idea.id}/monitoring/tasks/${task.id}`, { method: 'DELETE' });
      setData((current) => current ? {
        ...current,
        tasks: current.tasks.filter((entry) => entry.id !== task.id),
        attachments: current.attachments.map((attachment) => (
          attachment.taskId === task.id ? { ...attachment, taskId: null } : attachment
        )),
      } : current);
      if (attachmentTaskId === String(task.id)) setAttachmentTaskId('');
    } catch (deleteError) {
      fail(deleteError);
    } finally {
      setBusy('');
    }
  }

  async function uploadAttachment(event) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setNotice({ type: 'error', message: 'Pilih file yang ingin diunggah.' });
      return;
    }

    setUploading(true);
    setNotice(null);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('date', date);
      if (attachmentTaskId) body.append('taskId', attachmentTaskId);

      const attachment = await api(`/ideas/${idea.id}/monitoring/attachments`, {
        method: 'POST',
        body,
      });
      setData((current) => current ? {
        ...current,
        attachments: [attachment, ...current.attachments],
      } : current);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setAttachmentTaskId('');
      setNotice({ type: 'success', message: 'Lampiran berhasil diunggah.' });
    } catch (uploadError) {
      fail(uploadError);
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(attachment) {
    const confirmed = window.confirm(`Hapus lampiran "${attachment.fileName}"?`);
    if (!confirmed) return;

    setBusy(`attachment-delete-${attachment.id}`);
    setNotice(null);

    try {
      await api(`/ideas/${idea.id}/monitoring/attachments/${attachment.id}`, {
        method: 'DELETE',
      });
      setData((current) => current ? {
        ...current,
        attachments: current.attachments.filter((entry) => entry.id !== attachment.id),
      } : current);
    } catch (deleteError) {
      fail(deleteError);
    } finally {
      setBusy('');
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Memuat monitoring...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-1 py-8 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          notice.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}
        >
          {notice.message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Link2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Link demo</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Simpan URL demo atau staging supaya hasil terbaru mudah dibuka.
            </p>
            <form onSubmit={saveDemo} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={demoDraft}
                onChange={(event) => setDemoDraft(event.target.value)}
                placeholder="https://demo.example.com"
                maxLength={2000}
                className={inputClass}
                aria-label="Link demo"
              />
              <button
                type="submit"
                disabled={busy === 'demo'}
                className={`${smallButtonClass} bg-indigo-600 text-white hover:bg-indigo-500`}
              >
                {busy === 'demo' ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan
              </button>
            </form>
            {data?.idea?.demoUrl && (
              <a
                href={data.idea.demoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Buka demo
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeDate(shiftWibDate(date, -1))}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(event) => changeDate(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
            aria-label="Tanggal monitoring"
          />
          <button
            type="button"
            onClick={() => changeDate(shiftWibDate(date, 1))}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-1 sm:px-0">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-600">{formatWibDate(date)}</span>
          {date !== today && (
            <button
              type="button"
              onClick={() => changeDate(today)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
            >
              Hari ini
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Checklist hari ini"
          value={`${checklistDone}/${data?.checklist.length || 0}`}
          detail={`${checklistProgress}% selesai`}
          icon={ListChecks}
          tone="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Task selesai"
          value={`${taskDone}/${data?.tasks.length || 0}`}
          detail="Seluruh task proyek"
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Lampiran"
          value={data?.attachments.length || 0}
          detail={`Diunggah pada ${formatWibDate(date)}`}
          icon={Paperclip}
          tone="bg-amber-50 text-amber-600"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Checklist harian</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Checklist tetap ada setiap hari; centang sesuai tanggal yang dipilih.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {checklistProgress}%
          </span>
        </header>

        <form onSubmit={addChecklist} className="flex gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <input
            value={newChecklist}
            onChange={(event) => setNewChecklist(event.target.value)}
            maxLength={200}
            placeholder="Tambah item checklist, mis. cek error log"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy === 'checklist-add' || !newChecklist.trim()}
            className={`${smallButtonClass} shrink-0 bg-slate-900 text-white hover:bg-slate-700`}
          >
            {busy === 'checklist-add' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tambah
          </button>
        </form>

        {data?.checklist.length ? (
          <ul className="divide-y divide-slate-100">
            {data.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.isDone}
                  aria-label={`Centang ${item.label}`}
                  onClick={() => toggleChecklist(item)}
                  disabled={busy === `check-${item.id}`}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                    item.isDone
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white text-transparent hover:border-indigo-400'
                  } ${busy === `check-${item.id}` ? 'opacity-60' : ''}`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <span className={`min-w-0 flex-1 text-sm ${item.isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {item.label}
                </span>
                <button
                  type="button"
                  onClick={() => deleteChecklist(item)}
                  disabled={busy === `checklist-delete-${item.id}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Hapus checklist ${item.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Belum ada item checklist. Tambahkan kegiatan rutin yang perlu dicek setiap hari.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Catatan harian</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Tulis progress, keputusan, atau kendala yang ditemukan pada tanggal ini.
          </p>
        </header>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Progress hari ini</span>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={10000}
              placeholder="Contoh: menyelesaikan halaman checkout, memperbaiki bug upload."
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Blocker / kendala</span>
            <textarea
              rows={4}
              value={blockers}
              onChange={(event) => setBlockers(event.target.value)}
              maxLength={10000}
              placeholder="Contoh: menunggu akses payment gateway."
              className={inputClass}
            />
          </label>
        </div>
        <footer className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <button
            type="button"
            onClick={saveNotes}
            disabled={busy === 'notes'}
            className={`${smallButtonClass} bg-indigo-600 text-white hover:bg-indigo-500`}
          >
            {busy === 'notes' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan catatan
          </button>
        </footer>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Task yang dikerjakan</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Daftar task proyek beserta status dan tanggal pengerjaannya.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {taskDone}/{data?.tasks.length || 0} selesai
          </span>
        </header>

        <form onSubmit={addTask} className="grid gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
          <input
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            maxLength={200}
            placeholder="Task baru, mis. integrasi payment gateway"
            className={inputClass}
            aria-label="Judul task baru"
          />
          <select
            value={newTaskStatus}
            onChange={(event) => setNewTaskStatus(event.target.value)}
            className={inputClass}
            aria-label="Status task baru"
          >
            {TASK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={newTaskDate}
            onChange={(event) => setNewTaskDate(event.target.value)}
            className={inputClass}
            aria-label="Tanggal pengerjaan task"
          />
          <button
            type="submit"
            disabled={busy === 'task-add' || !newTaskTitle.trim()}
            className={`${smallButtonClass} bg-slate-900 text-white hover:bg-slate-700`}
          >
            {busy === 'task-add' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tambah
          </button>
        </form>

        {data?.tasks.length ? (
          <ul className="divide-y divide-slate-100">
            {data.tasks.map((task) => (
              <li key={task.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <select
                  value={task.status}
                  onChange={(event) => updateTaskStatus(task, event.target.value)}
                  disabled={busy === `task-status-${task.id}`}
                  className="w-fit rounded-full border-0 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 outline-none ring-0"
                  aria-label={`Status ${task.title}`}
                >
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className={`min-w-0 flex-1 text-sm ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {task.title}
                </span>
                {task.workedOn && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                    <CalendarDays className="h-3 w-3" />
                    {formatWibDate(task.workedOn)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask(task)}
                  disabled={busy === `task-delete-${task.id}`}
                  className="grid h-8 w-8 shrink-0 place-items-center self-end rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:self-auto"
                  aria-label={`Hapus task ${task.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Belum ada task. Tambahkan pekerjaan yang sedang atau akan dikerjakan.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Lampiran</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Unggah screenshot, dokumen, atau file pendukung untuk tanggal ini. Maksimal 5 MB per file.
          </p>
        </header>

        <form onSubmit={uploadAttachment} className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row">
          <input
            ref={fileInputRef}
            type="file"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-600"
            aria-label="File lampiran"
          />
          <select
            value={attachmentTaskId}
            onChange={(event) => setAttachmentTaskId(event.target.value)}
            className={`${inputClass} sm:max-w-52`}
            aria-label="Task terkait lampiran"
          >
            <option value="">Tanpa task</option>
            {data?.tasks.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={uploading}
            className={`${smallButtonClass} shrink-0 bg-indigo-600 text-white hover:bg-indigo-500`}
          >
            {uploading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Mengunggah...' : 'Unggah'}
          </button>
        </form>

        {data?.attachments.length ? (
          <ul className="divide-y divide-slate-100">
            {data.attachments.map((attachment) => {
              const relatedTask = data.tasks.find((task) => task.id === attachment.taskId);
              return (
                <li key={attachment.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                    <Paperclip className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/api/ideas/${idea.id}/monitoring/attachments/${attachment.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 truncate text-sm font-medium text-slate-700 hover:text-indigo-600"
                    >
                      <span className="truncate">{attachment.fileName}</span>
                      <Download className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {formatFileSize(attachment.sizeBytes)}
                      {relatedTask ? ` · ${relatedTask.title}` : ' · Lampiran harian'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAttachment(attachment)}
                    disabled={busy === `attachment-delete-${attachment.id}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Hapus lampiran ${attachment.fileName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Belum ada lampiran untuk tanggal ini.
          </p>
        )}
      </section>
    </div>
  );
}
