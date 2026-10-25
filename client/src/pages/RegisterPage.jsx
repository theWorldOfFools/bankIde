import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, LoaderCircle, MailCheck, Send, ShieldAlert } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    let active = true;

    api('/auth/registration-status')
      .then((payload) => {
        if (active) setStatus(payload);
      })
      .catch((loadError) => {
        if (active) setStatusError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password.length < 12) {
      setError('Password minimal 12 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = await register(email.trim(), password);
      if (payload.authenticated) {
        navigate('/', { replace: true });
      } else {
        setSentEmail(payload.email || email.trim());
      }
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendNotice('');
    try {
      const payload = await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: sentEmail }),
      });
      setResendNotice(payload.message);
    } catch (resendError) {
      setResendNotice(resendError.message);
    } finally {
      setResending(false);
    }
  }

  if (statusError) {
    return (
      <AuthShell>
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Status registrasi tidak tersedia</h2>
          <p className="mt-2 text-sm text-slate-500">{statusError}</p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (!status) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (sentEmail) {
    return (
      <AuthShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <MailCheck className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            Cek email kamu
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Kami mengirim tautan verifikasi ke <strong className="text-slate-700">{sentEmail}</strong>.
            Setelah email terverifikasi, akun menunggu persetujuan admin sebelum bisa masuk.
          </p>

          {resendNotice && (
            <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              {resendNotice}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
            >
              {resending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {resending ? 'Mengirim...' : 'Kirim ulang email verifikasi'}
            </button>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Kembali ke halaman masuk
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  const bootstrap = status.adminBootstrap;

  if (!bootstrap && !status.userRegistrationOpen) {
    return (
      <AuthShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            Registrasi belum dibuka
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {status.emailConfigured
              ? 'Registrasi user sedang ditutup. Silakan hubungi admin workspace.'
              : 'Registrasi user membutuhkan konfigurasi email (SMTP) pada server. Hubungi admin workspace.'}
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <p className="text-sm font-medium text-indigo-600">
        {bootstrap ? 'Mulai dari sini' : 'Daftar akun'}
      </p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {bootstrap ? 'Buat akun admin' : 'Buat akun user'}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {bootstrap
          ? 'Registrasi terbuka karena workspace belum memiliki admin. Akun pertama otomatis menjadi admin.'
          : 'Setelah mendaftar, verifikasi email lalu tunggu persetujuan admin sebelum bisa masuk.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="nama@email.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="Minimal 12 karakter"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Konfirmasi password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
            placeholder="Ulangi password"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {submitting
            ? 'Membuat akun...'
            : bootstrap
              ? 'Buat akun admin'
              : 'Daftar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Sudah punya akun?{' '}
        <Link
          to="/login"
          className="font-semibold text-indigo-600 transition hover:text-indigo-500"
        >
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
