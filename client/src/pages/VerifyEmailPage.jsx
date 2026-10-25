import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, LoaderCircle, ShieldAlert } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { api } from '../lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Tautan verifikasi tidak lengkap.');
      return;
    }

    let active = true;

    api('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((payload) => {
        if (!active) return;
        setState(payload.status === 'active' ? 'active' : 'pending');
        setMessage(payload.message);
      })
      .catch((error) => {
        if (!active) return;
        setState('error');
        setMessage(error.message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthShell>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state === 'verifying' && (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Memverifikasi email
            </h2>
            <p className="mt-2 text-sm text-slate-500">Mohon tunggu sebentar.</p>
          </>
        )}

        {(state === 'pending' || state === 'active') && (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              {state === 'active' ? 'Email terverifikasi' : 'Email berhasil diverifikasi'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {state === 'active'
                ? 'Akun Anda sudah aktif. Silakan masuk.'
                : 'Pendaftaran Anda sekarang menunggu persetujuan admin. Anda akan menerima email setelah akun disetujui.'}
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Verifikasi gagal
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>
          </>
        )}

        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Ke halaman masuk
        </Link>
      </div>
    </AuthShell>
  );
}
