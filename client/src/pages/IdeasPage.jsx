import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BellRing,
  Clock3,
  Eye,
  FileUp,
  LayoutGrid,
  List,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { STATUS_META, STATUS_ORDER } from '../lib/constants';
import { formatDateTime, isOverdue } from '../lib/dates';
import IdeaDetailModal from '../components/IdeaDetailModal';
import IdeaFormModal from '../components/IdeaFormModal';

const PAGE_SIZE = 12;

const noticeTone = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

function Notice({ notice, onDismiss }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${noticeTone[notice.type] || noticeTone.success}`}>
      <p className="leading-relaxed">{notice.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-0.5 shrink-0 opacity-60 transition hover:opacity-100"
        aria-label="Tutup notifikasi"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <BellRing className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">Belum ada ide yang cocok</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ubah filter atau mulai simpan ide pertama Anda di BankIde.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" />
        Tambah Ide
      </button>
    </div>
  );
}

export default function IdeasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    page: 1,
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState(() => {
    const stored = localStorage.getItem('bankide.view');
    if (stored === 'cards' || stored === 'table') return stored;
    return window.matchMedia('(max-width: 767px)').matches ? 'cards' : 'table';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState(null);
  const fileInputRef = useRef(null);
  const focusId = Number(searchParams.get('focus')) || null;
  const isNewIdea = searchParams.get('new') === '1';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isNewIdea) return;
    setEditing(null);
    setFormOpen(true);
  }, [isNewIdea]);

  useEffect(() => {
    if (!focusId) return undefined;
    let active = true;

    api(`/ideas/${focusId}`)
      .then((idea) => {
        if (!active) return;
        setViewing(idea);
      })
      .catch((focusError) => {
        if (active && focusError.status !== 401) {
          setNotice({ type: 'error', message: focusError.message });
        }
      });

    return () => {
      active = false;
    };
  }, [focusId]);

  const loadCategories = useCallback(async () => {
    try {
      const payload = await api('/ideas/categories');
      setCategories(payload.items || []);
    } catch (loadError) {
      console.error(loadError);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadIdeas = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    const query = new URLSearchParams({
      page: String(filters.page),
      limit: String(PAGE_SIZE),
      search: debouncedSearch,
      category: filters.category,
      status: filters.status,
    });

    try {
      const payload = await api(`/ideas?${query.toString()}`, { signal });
      setItems(payload.items);
      setMeta(payload.meta);
    } catch (loadError) {
      if (loadError.name !== 'AbortError') {
        setError(loadError.message);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [debouncedSearch, filters.category, filters.status, filters.page]);

  useEffect(() => {
    const controller = new AbortController();
    loadIdeas(controller.signal);
    return () => controller.abort();
  }, [loadIdeas]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  }

  function changeView(nextView) {
    setView(nextView);
    localStorage.setItem('bankide.view', nextView);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openDetail(idea) {
    setViewing(idea);
  }

  function openEdit(idea) {
    setViewing(null);
    setEditing(idea);
    setFormOpen(true);
  }

  function closeDetail() {
    setViewing(null);
    if (searchParams.has('focus')) {
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    if (searchParams.has('new') || searchParams.has('focus')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  }

  async function handleSaved(message) {
    closeForm();
    setNotice({ type: 'success', message });
    await Promise.all([loadIdeas(), loadCategories()]);
  }

  async function handleDelete(idea) {
    const confirmed = window.confirm(`Hapus ide "${idea.title}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    try {
      await api(`/ideas/${idea.id}`, { method: 'DELETE' });
      setNotice({ type: 'success', message: 'Ide berhasil dihapus.' });
      if (items.length === 1 && filters.page > 1) {
        setFilters((current) => ({ ...current, page: current.page - 1 }));
      } else {
        await loadIdeas();
      }
      await loadCategories();
    } catch (deleteError) {
      setNotice({ type: 'error', message: deleteError.message });
    }
  }

  async function handleStatusChange(idea, status) {
    const previousItems = items;
    setPendingStatusId(idea.id);
    setItems((current) => current.map((item) => (
      item.id === idea.id ? { ...item, status } : item
    )));

    try {
      await api(`/ideas/${idea.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice({ type: 'success', message: 'Status ide diperbarui.' });
    } catch (updateError) {
      setItems(previousItems);
      setNotice({ type: 'error', message: updateError.message });
    } finally {
      setPendingStatusId(null);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setNotice(null);

    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api('/import/ideas', { method: 'POST', body });
      const hasWarnings = result.invalid > 0 || (result.warnings?.length || 0) > 0;
      const firstError = result.errors?.[0]
        ? ` Baris ${result.errors[0].row}: ${result.errors[0].message}`
        : '';

      setNotice({
        type: hasWarnings ? 'warning' : 'success',
        message: `Import selesai: ${result.inserted} ditambahkan, ${result.skipped} duplikat dilewati, ${result.invalid} baris gagal.${firstError}`,
      });
      await Promise.all([loadIdeas(), loadCategories()]);
    } catch (importError) {
      setNotice({ type: 'error', message: importError.message });
    } finally {
      setImporting(false);
    }
  }

  function goToPage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  const hasFilters = Boolean(filters.search || filters.category || filters.status);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Perpustakaan Ide</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Daftar Ide
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cari, filter, dan ubah ide dari tabel atau tampilan kartu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
          >
            {importing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {importing ? 'Mengimpor...' : 'Impor Excel'}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Ide Baru
          </button>
        </div>
      </header>

      {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Cari ide</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder="Cari ide, konteks, atau solusi..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <select
                value={filters.category}
                onChange={(event) => updateFilter('category', event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
                aria-label="Filter kategori"
              >
                <option value="">Semua kategori</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
                aria-label="Filter status"
              >
                <option value="">Semua status</option>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>{STATUS_META[status].label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => setFilters({ search: '', category: '', status: '', page: 1 })}
                  className="text-xs font-medium text-slate-400 transition hover:text-rose-500"
                >
                  Reset filter
                </button>
              )}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => changeView('table')}
                  aria-label="Tampilan tabel"
                  aria-pressed={view === 'table'}
                  className={`grid h-8 w-8 place-items-center rounded-md transition ${view === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => changeView('cards')}
                  aria-label="Tampilan kartu"
                  aria-pressed={view === 'cards'}
                  className={`grid h-8 w-8 place-items-center rounded-md transition ${view === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat ide...
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => loadIdeas()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Ide</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pengingat</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((idea) => {
                  const overdue = isOverdue(idea.reminderAt);
                  return (
                    <tr
                      key={idea.id}
                      className={`group transition hover:bg-slate-50/80 ${focusId === idea.id ? 'bg-indigo-50/50' : ''}`}
                    >
                      <td className="max-w-xs px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => openDetail(idea)}
                          className="block max-w-full text-left"
                        >
                          <span className="block truncate text-sm font-medium text-slate-800 transition group-hover:text-indigo-600">
                            {idea.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-400">
                            {idea.context || 'Tanpa konteks'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex max-w-40 truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {idea.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={idea.status}
                          disabled={pendingStatusId === idea.id}
                          onChange={(event) => handleStatusChange(idea, event.target.value)}
                          className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ring-0 ${STATUS_META[idea.status]?.className || STATUS_META.idea.className}`}
                          aria-label={`Status ${idea.title}`}
                        >
                          {STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>{STATUS_META[status].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        {idea.reminderAt ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs ${overdue ? 'text-rose-600' : 'text-slate-600'}`}>
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateTime(idea.reminderAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetail(idea)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            aria-label={`Lihat detail ${idea.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(idea)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            aria-label={`Edit ${idea.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(idea)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${idea.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((idea) => {
              const overdue = isOverdue(idea.reminderAt);
              return (
                <article
                  key={idea.id}
                  className={`flex flex-col rounded-2xl border p-4 transition hover:border-indigo-200 ${focusId === idea.id ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openDetail(idea)}
                      className="min-w-0 text-left"
                    >
                      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{idea.title}</h3>
                      <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {idea.category}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openDetail(idea)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        aria-label={`Lihat detail ${idea.title}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(idea)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        aria-label={`Edit ${idea.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(idea)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Hapus ${idea.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-500">
                    {idea.context || 'Belum ada konteks untuk ide ini.'}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <select
                      value={idea.status}
                      disabled={pendingStatusId === idea.id}
                      onChange={(event) => handleStatusChange(idea, event.target.value)}
                      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-[11px] font-medium outline-none ring-0 ${STATUS_META[idea.status]?.className || STATUS_META.idea.className}`}
                      aria-label={`Status ${idea.title}`}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>{STATUS_META[status].label}</option>
                      ))}
                    </select>
                    {idea.reminderAt ? (
                      <span className={`inline-flex items-center gap-1 text-[11px] ${overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                        <Clock3 className="h-3 w-3" />
                        {formatDateTime(idea.reminderAt)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">Tanpa pengingat</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Menampilkan {items.length} dari {meta.total} ide
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => goToPage(meta.page - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span>
              Halaman {meta.page} / {Math.max(meta.totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages || meta.totalPages === 0}
              onClick={() => goToPage(meta.page + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </footer>
      </section>

      {viewing && (
        <IdeaDetailModal
          idea={viewing}
          onClose={closeDetail}
          onEdit={() => openEdit(viewing)}
        />
      )}

      {formOpen && (
        <IdeaFormModal
          idea={editing}
          categories={categories}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
