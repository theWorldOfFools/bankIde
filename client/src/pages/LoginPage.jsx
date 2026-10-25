import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LoaderCircle, Send } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    let active = true;

    api('/auth/registration-status')
      .then((payload) => {
        if (active) {
          setRegistrationOpen(Boolean(payload.adminBootstrap || payload.userRegistrationOpen));
        }
      })
      .catch(() => {});

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
    setErrorCode('');
    setResendNotice('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.message);
      setErrorCode(loginError.code || '');
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
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendNotice(payload.message);
    } catch (resendError) {
      setResendNotice(resendError.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell>
      <p className="text-sm font-medium text-indigo-600">Selamat datang kembali</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        Masuk ke workspace
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Gunakan akun yang sudah terdaftar dan disetujui admin.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
            {errorCode === 'email_unverified' && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-rose-700 underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
              >
                {resending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {resending ? 'Mengirim...' : 'Kirim ulang email verifikasi'}
              </button>
            )}
            {resendNotice && <span className="mt-2 block text-rose-600">{resendNotice}</span>}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="nama@email.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="Masukkan password"
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
          {submitting ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>

      {registrationOpen && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link
            to="/register"
            className="font-semibold text-indigo-600 transition hover:text-indigo-500"
          >
            Daftar
          </Link>
        </p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-slate-400">
        Sesi disimpan sebagai cookie httpOnly selama 7 hari. Pastikan aplikasi diakses melalui
        HTTPS saat digunakan di luar localhost.
      </p>
    </AuthShell>
  );
}
