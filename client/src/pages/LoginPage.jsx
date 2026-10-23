import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Lightbulb, LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { admin, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (admin) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-indigo-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-indigo-400/20" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-semibold">BankIde</p>
            <p className="text-sm text-indigo-200">Bank ide, bukan bank data yang terlupakan.</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-200">
            Dari catatan menjadi dampak
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
            Tempat rapi untuk ide yang layak dikerjakan.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-indigo-100">
            Kelola ide, jadwalkan pengingat, impor spreadsheet lama, dan temukan peluang baru
            tanpa kehilangan konteks.
          </p>
        </div>

        <div className="relative grid max-w-md grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-2xl font-semibold">01</p>
            <p className="mt-1 text-indigo-200">Kumpulkan</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">02</p>
            <p className="mt-1 text-indigo-200">Prioritaskan</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">03</p>
            <p className="mt-1 text-indigo-200">Eksekusi</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white">
              <Lightbulb className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold text-slate-900">BankIde</span>
          </div>

          <p className="text-sm font-medium text-indigo-600">Selamat datang kembali</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            Masuk ke workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Gunakan akun admin yang sudah dikonfigurasi pada server.
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
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="admin@bankide.local"
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

          <p className="mt-8 text-xs leading-relaxed text-slate-400">
            Sesi disimpan sebagai cookie httpOnly selama 7 hari. Pastikan aplikasi diakses melalui
            HTTPS saat digunakan di luar localhost.
          </p>
        </div>
      </section>
    </div>
  );
}
