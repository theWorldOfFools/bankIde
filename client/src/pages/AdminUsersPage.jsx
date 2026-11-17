import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Check,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/dates';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';

const STATUS_META = {
  pending_email: {
    label: 'Belum verifikasi email',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  pending_approval: {
    label: 'Menunggu persetujuan',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  active: {
    label: 'Aktif',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Ditolak',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const TABS = [
  { value: 'pending_approval', label: 'Menunggu persetujuan' },
  { value: 'active', label: 'Aktif' },
  { value: '', label: 'Semua' },
];

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending_email;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function AdminUsersPage() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('pending_approval');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const stored = Number(localStorage.getItem('bankide.usersPageSize'));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : PAGE_SIZE;
  });
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (tab) query.set('status', tab);

      const payload = await api(`/admin/users?${query.toString()}`);
      if (payload.meta?.totalPages > 0 && page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }

      setItems(payload.items);
      if (payload.meta) setMeta(payload.meta);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [tab, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (user && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  function changeTab(value) {
    setTab(value);
    setPage(1);
  }

  function changePageSize(size) {
    setPageSize(size);
    setPage(1);
    localStorage.setItem('bankide.usersPageSize', String(size));
  }

  async function handleAction(item, action) {
    setActionId(item.id);
    setNotice(null);
    try {
      await api(`/admin/users/${item.id}/${action}`, { method: 'POST' });
      setNotice({
        type: 'success',
        message: action === 'approve'
          ? `Akun ${item.email} disetujui.`
          : `Pendaftaran ${item.email} ditolak.`,
      });
      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
    } catch (actionError) {
      setNotice({ type: 'error', message: actionError.message });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administrasi"
        title="Kelola User"
        description="Setujui pendaftaran user setelah email mereka terverifikasi."
        icon={Users}
        actions={(
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/75 px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Muat ulang
          </button>
        )}
      />

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            notice.type === 'error'
              ? 'border-rose-200/80 bg-rose-50/90 text-rose-700'
              : 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700'
          }`}
        >
          <p>{notice.message}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="opacity-60 transition hover:opacity-100"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      <section className="surface-card overflow-hidden rounded-3xl">
        <div className="flex flex-wrap gap-1 border-b border-white/60 bg-white/40 p-3">
          {TABS.map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => changeTab(item.value)}
              className={`relative rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                tab === item.value
                  ? 'text-white'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
              }`}
            >
              {tab === item.value && (
                <motion.span
                  layoutId="admin-tab-active"
                  className="absolute inset-0 rounded-xl bg-slate-950 shadow-lg shadow-slate-900/25"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{item.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-slate-400">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
            </span>
            Memuat user...
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <motion.span
              initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-2xl shadow-indigo-500/25"
            >
              {tab === 'pending_approval' ? <UserCheck className="h-7 w-7" /> : <Users className="h-7 w-7" />}
            </motion.span>
            <h3 className="mt-5 text-lg font-semibold text-slate-950">
              {tab === 'pending_approval' ? 'Tidak ada user yang menunggu' : 'Belum ada user'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {tab === 'pending_approval'
                ? 'Pendaftaran yang sudah memverifikasi email akan muncul di sini.'
                : 'User baru akan muncul setelah mendaftar dan memverifikasi email.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/60">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 px-4 py-4 transition hover:bg-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-700 text-[11px] font-bold text-white shadow-lg shadow-slate-900/20">
                    {(item.email || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{item.email}</p>
                      <StatusBadge status={item.status} />
                      {item.role === 'admin' && (
                        <span className="rounded-full border border-slate-200/80 bg-slate-100/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>Daftar {formatDateTime(item.createdAt)}</span>
                      {item.emailVerifiedAt && (
                        <span className="inline-flex items-center gap-1">
                          <MailCheck className="h-3.5 w-3.5" />
                          Email terverifikasi
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 pl-[3.25rem] sm:pl-0">
                  {item.status === 'pending_approval' && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAction(item, 'approve')}
                      disabled={actionId === item.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      {actionId === item.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Setujui
                    </motion.button>
                  )}
                  {(item.status === 'pending_approval' || item.status === 'pending_email') && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAction(item, 'reject')}
                      disabled={actionId === item.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-white/80 px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Tolak
                    </motion.button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="border-t border-white/60 bg-white/45 px-4 py-3.5 sm:px-5">
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            pageSize={pageSize}
            onPageChange={setPage}
            label="user"
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={changePageSize}
          />
        </footer>
      </section>
    </div>
  );
}
