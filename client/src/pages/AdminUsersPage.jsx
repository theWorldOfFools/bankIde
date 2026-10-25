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
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/dates';

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

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending_email;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function AdminUsersPage() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('pending_approval');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = tab ? `?status=${tab}` : '';
      const payload = await api(`/admin/users${query}`);
      setItems(payload.items);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  if (user && !isAdmin) {
    return <Navigate to="/" replace />;
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
      await load();
    } catch (actionError) {
      setNotice({ type: 'error', message: actionError.message });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Administrasi</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Kelola User
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Setujui pendaftaran user setelah email mereka terverifikasi.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Muat ulang
        </button>
      </header>

      {notice && (
        <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
          notice.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          <p>{notice.message}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="opacity-60 transition hover:opacity-100"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 p-3">
          {TABS.map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => setTab(item.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === item.value
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat user...
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              {tab === 'pending_approval' ? <UserCheck className="h-6 w-6" /> : <Users className="h-6 w-6" />}
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">
              {tab === 'pending_approval' ? 'Tidak ada user yang menunggu' : 'Belum ada user'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {tab === 'pending_approval'
                ? 'Pendaftaran yang sudah memverifikasi email akan muncul di sini.'
                : 'User baru akan muncul setelah mendaftar dan memverifikasi email.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{item.email}</p>
                    <StatusBadge status={item.status} />
                    {item.role === 'admin' && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
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

                <div className="flex shrink-0 items-center gap-2">
                  {item.status === 'pending_approval' && (
                    <button
                      type="button"
                      onClick={() => handleAction(item, 'approve')}
                      disabled={actionId === item.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      {actionId === item.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Setujui
                    </button>
                  )}
                  {(item.status === 'pending_approval' || item.status === 'pending_email') && (
                    <button
                      type="button"
                      onClick={() => handleAction(item, 'reject')}
                      disabled={actionId === item.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Tolak
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
