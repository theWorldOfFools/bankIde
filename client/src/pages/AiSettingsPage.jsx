import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cloud,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/dates';
import PageHeader from '../components/PageHeader';

const DEFAULT_TIMEOUT = 20000;

const SOURCE_META = {
  database: {
    label: 'Database',
    className: 'border-indigo-200/80 bg-indigo-50 text-indigo-700',
    icon: Database,
  },
  environment: {
    label: 'Environment',
    className: 'border-sky-200/80 bg-sky-50 text-sky-700',
    icon: Cloud,
  },
  none: {
    label: 'Belum tersedia',
    className: 'border-slate-200/80 bg-slate-50 text-slate-500',
    icon: AlertTriangle,
  },
};

function SourceTag({ source }) {
  const meta = SOURCE_META[source] || SOURCE_META.none;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function StatusPanel({ settings }) {
  let status;

  if (settings.enabled) {
    status = {
      label: 'AI aktif',
      description: 'Rekomendasi dan insight akan memakai konfigurasi ini tanpa restart server.',
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      badgeClass: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
    };
  } else if (!settings.enabledSetting) {
    status = {
      label: 'AI dimatikan',
      description: 'Toggle AI sedang nonaktif. Fitur AI akan memakai fallback lokal.',
      icon: AlertTriangle,
      iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      badgeClass: 'border-amber-200/80 bg-amber-50 text-amber-700',
    };
  } else if (!settings.apiKeyConfigured) {
    status = {
      label: 'API key belum ada',
      description: 'Isi API key agar AI dapat digunakan, atau gunakan fallback lokal.',
      icon: KeyRound,
      iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      badgeClass: 'border-amber-200/80 bg-amber-50 text-amber-700',
    };
  } else if (!settings.model) {
    status = {
      label: 'Model belum diisi',
      description: 'Tentukan model AI agar permintaan dapat dikirim ke provider.',
      icon: Bot,
      iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      badgeClass: 'border-amber-200/80 bg-amber-50 text-amber-700',
    };
  } else {
    status = {
      label: 'AI belum lengkap',
      description: 'Lengkapi konfigurasi agar AI dapat digunakan.',
      icon: AlertTriangle,
      iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      badgeClass: 'border-amber-200/80 bg-amber-50 text-amber-700',
    };
  }

  const StatusIcon = status.icon;

  return (
    <section className="surface-card rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset ${status.iconClass}`}>
          <StatusIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${status.badgeClass}`}>
            {status.label}
          </span>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{status.description}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-3 border-t border-white/70 pt-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-400">
            <Database className="h-3.5 w-3.5" />
            Penyimpanan
          </dt>
          <dd className="text-right font-semibold text-slate-700">
            {settings.usingDatabase ? 'Override database' : 'Environment default'}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-400">
            <KeyRound className="h-3.5 w-3.5" />
            API key
          </dt>
          <dd className="text-right">
            <SourceTag source={settings.apiKeySource} />
            {settings.apiKeyConfigured && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">{settings.apiKeyHint}</p>
            )}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-400">
            <Cloud className="h-3.5 w-3.5" />
            Base URL
          </dt>
          <dd className="max-w-[11rem] break-all text-right font-medium text-slate-600">
            {settings.baseUrl}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-400">
            <Bot className="h-3.5 w-3.5" />
            Model
          </dt>
          <dd className="max-w-[11rem] break-all text-right font-medium text-slate-600">
            {settings.model || '-'}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-400">
            <Timer className="h-3.5 w-3.5" />
            Timeout
          </dt>
          <dd className="text-right font-medium text-slate-600">
            {settings.timeoutMs.toLocaleString('id-ID')} ms
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-indigo-100/70 bg-indigo-50/60 p-3 text-[11px] leading-relaxed text-indigo-700">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          API key disimpan terenkripsi dan tidak pernah dikirim kembali secara utuh oleh API.
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {settings.updatedAt
          ? `Terakhir diubah ${formatDateTime(settings.updatedAt)}${settings.updatedBy ? ` oleh ${settings.updatedBy}` : ''}.`
          : 'Belum ada override dari database.'}
      </p>
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-3xl bg-white/60" />
        <div className="h-64 animate-pulse rounded-3xl bg-white/60" />
        <div className="h-48 animate-pulse rounded-3xl bg-white/60" />
      </div>
      <div className="h-96 animate-pulse rounded-3xl bg-white/60" />
    </div>
  );
}

export default function AiSettingsPage() {
  const { user, isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    enabled: true,
    apiKey: '',
    clearApiKey: false,
    baseUrl: '',
    model: '',
    timeoutMs: String(DEFAULT_TIMEOUT),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const applySettings = useCallback((next) => {
    setSettings(next);
    setForm({
      enabled: next.enabledSetting,
      apiKey: '',
      clearApiKey: false,
      baseUrl: next.baseUrlSource === 'database' ? next.baseUrl : '',
      model: next.modelSource === 'database' ? next.model : '',
      timeoutMs: String(next.timeoutMs || next.envDefaults?.timeoutMs || DEFAULT_TIMEOUT),
    });
    setShowKey(false);
    setTestResult(null);
    setConfirmReset(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await api('/admin/ai');
      applySettings(payload.settings);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

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

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateTimeout() {
    const timeout = Number(form.timeoutMs);
    if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 120000) {
      setError('Timeout harus berupa angka antara 1000 dan 120000 ms.');
      return null;
    }
    return timeout;
  }

  async function handleSave(event) {
    event.preventDefault();
    const timeoutMs = validateTimeout();
    if (timeoutMs === null) return;

    setSaving(true);
    setError('');
    setNotice(null);
    try {
      const payload = await api('/admin/ai', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: form.enabled,
          apiKey: form.apiKey,
          clearApiKey: form.clearApiKey,
          baseUrl: form.baseUrl,
          model: form.model,
          timeoutMs,
        }),
      });
      applySettings(payload.settings);
      setNotice(payload.settings.enabled
        ? { tone: 'success', message: 'Pengaturan AI disimpan dan langsung berlaku.' }
        : { tone: 'warning', message: 'Pengaturan disimpan, tetapi AI belum aktif. Lengkapi API key dan model.' });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const timeoutMs = validateTimeout();
    if (timeoutMs === null) return;

    setTesting(true);
    setError('');
    setNotice(null);
    setTestResult(null);
    try {
      const payload = await api('/admin/ai/test', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: form.apiKey,
          baseUrl: form.baseUrl,
          model: form.model,
          timeoutMs,
        }),
      });
      setTestResult(payload.result);
      setNotice({ tone: 'success', message: 'Koneksi ke provider AI berhasil.' });
    } catch (testError) {
      setError(testError.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError('');
    setNotice(null);
    try {
      const payload = await api('/admin/ai', { method: 'DELETE' });
      applySettings(payload.settings);
      setNotice({ tone: 'success', message: 'Override database dihapus. Konfigurasi kembali memakai environment.' });
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setResetting(false);
    }
  }

  const inputClass = 'w-full rounded-2xl border border-white/70 bg-white/75 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/70 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';
  const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Konfigurasi Workspace"
        title={(
          <>
            Pengaturan <span className="text-gradient">AI</span>
          </>
        )}
        description="Atur provider, API key, dan model AI dari dashboard. Perubahan langsung dipakai fitur rekomendasi dan insight tanpa restart server."
        icon={Sparkles}
        actions={(
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/70 bg-white/75 text-slate-500 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
            aria-label="Muat ulang pengaturan AI"
            title="Muat ulang pengaturan AI"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      />

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            notice.tone === 'warning'
              ? 'border-amber-200/80 bg-amber-50/90 text-amber-800'
              : 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800'
          }`}
        >
          {notice.tone === 'warning' ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {notice.message}
        </motion.div>
      )}

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-rose-700 hover:text-rose-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Muat ulang
          </button>
        </div>
      )}

      {loading || !settings ? (
        <SettingsSkeleton />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form onSubmit={handleSave} className="space-y-5">
            <section className="surface-card rounded-3xl p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                    <Sparkles className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="font-semibold tracking-tight text-slate-950">Status AI</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      Saat dimatikan, fitur AI memakai fallback lokal tanpa mengirim data ke provider.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={form.enabled}
                  onClick={() => updateForm('enabled', !form.enabled)}
                  className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
                    form.enabled ? 'bg-slate-950' : 'bg-slate-200'
                  }`}
                  aria-label="Aktifkan AI"
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    className={`h-6 w-6 rounded-full bg-white shadow ${
                      form.enabled ? 'ml-auto' : 'mr-auto'
                    }`}
                  />
                </button>
              </div>

              {settings.enabledSetting && !settings.enabled && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Toggle aktif, tetapi AI belum bisa dipakai. Pastikan API key dan model tersedia.
                  </span>
                </div>
              )}
            </section>

            <section className="surface-card rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-sky-600">
                  <Cloud className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-semibold tracking-tight text-slate-950">Provider & model</h2>
                  <p className="text-xs text-slate-400">Gunakan API yang kompatibel dengan OpenAI.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className={labelClass}>Base URL</span>
                  <input
                    type="url"
                    value={form.baseUrl}
                    onChange={(event) => updateForm('baseUrl', event.target.value)}
                    placeholder={settings.envDefaults?.baseUrl || 'https://api.openai.com/v1'}
                    className={inputClass}
                  />
                  <span className="mt-1.5 block text-[11px] text-slate-400">
                    Kosongkan untuk memakai default environment.
                  </span>
                </label>

                <label className="block">
                  <span className={labelClass}>Model</span>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(event) => updateForm('model', event.target.value)}
                    placeholder={settings.envDefaults?.model || 'gpt-4o-mini'}
                    className={inputClass}
                  />
                  <span className="mt-1.5 block text-[11px] text-slate-400">
                    Contoh: <code className="rounded bg-slate-100 px-1 py-0.5">gpt-4o-mini</code>.
                  </span>
                </label>

                <label className="block">
                  <span className={labelClass}>Timeout (ms)</span>
                  <input
                    type="number"
                    min="1000"
                    max="120000"
                    step="1000"
                    value={form.timeoutMs}
                    onChange={(event) => updateForm('timeoutMs', event.target.value)}
                    className={inputClass}
                  />
                  <span className="mt-1.5 block text-[11px] text-slate-400">
                    Batas waktu permintaan ke provider AI.
                  </span>
                </label>
              </div>
            </section>

            <section className="surface-card rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-semibold tracking-tight text-slate-950">API key</h2>
                  <p className="text-xs text-slate-400">Disimpan terenkripsi di database.</p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className={labelClass}>API key baru</span>
                <span className="relative block">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    autoComplete="off"
                    value={form.apiKey}
                    onChange={(event) => updateForm('apiKey', event.target.value)}
                    disabled={form.clearApiKey}
                    placeholder={settings.apiKeyConfigured
                      ? 'Kosongkan untuk mempertahankan key tersimpan'
                      : 'Masukkan API key provider'}
                    className={`${inputClass} pl-10 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((current) => !current)}
                    disabled={form.clearApiKey}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                    aria-label={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                    title={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-400">
                {form.clearApiKey ? (
                  <span className="text-rose-600">
                    API key tersimpan akan dihapus saat pengaturan disimpan.
                  </span>
                ) : settings.apiKeyConfigured ? (
                  <span>
                    Key terpasang <span className="font-mono">{settings.apiKeyHint}</span> dari{' '}
                    {SOURCE_META[settings.apiKeySource]?.label || 'sumber tidak dikenal'}.
                  </span>
                ) : (
                  <span>Belum ada API key. AI tidak dapat memanggil provider tanpa key.</span>
                )}
                <span>Biarkan kosong untuk mempertahankan key yang sedang dipakai.</span>
              </div>

              {settings.apiKeySource === 'database' && (
                <label className="mt-4 flex items-start gap-2.5 rounded-2xl border border-white/70 bg-white/60 px-3.5 py-3 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.clearApiKey}
                    onChange={(event) => {
                      updateForm('clearApiKey', event.target.checked);
                      if (event.target.checked) updateForm('apiKey', '');
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                  />
                  <span>
                    Hapus API key yang tersimpan di database.
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      Jika environment masih memiliki <code className="rounded bg-slate-100 px-1 py-0.5">AI_API_KEY</code>, key tersebut akan dipakai kembali.
                    </span>
                  </span>
                </label>
              )}
            </section>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
              >
                {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {testing ? 'Menguji...' : 'Uji Koneksi'}
              </button>
              <button
                type="submit"
                disabled={saving || testing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-xs leading-relaxed text-emerald-800 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Koneksi berhasil dalam <strong>{testResult.latencyMs} ms</strong> memakai model{' '}
                  <strong>{testResult.model}</strong>.
                </span>
              </motion.div>
            )}
          </form>

          <aside className="space-y-5">
            <StatusPanel settings={settings} />

            <section className="surface-card rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <RotateCcw className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-semibold tracking-tight text-slate-950">Default environment</h2>
                  <p className="text-xs text-slate-400">Dipakai saat database kosong.</p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-400">Model</dt>
                  <dd className="max-w-[11rem] break-all text-right font-medium text-slate-600">
                    {settings.envDefaults?.model || '-'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-400">Base URL</dt>
                  <dd className="max-w-[11rem] break-all text-right font-medium text-slate-600">
                    {settings.envDefaults?.baseUrl || '-'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-400">API key</dt>
                  <dd className="text-right font-medium text-slate-600">
                    {settings.envDefaults?.apiKeyConfigured ? 'Tersedia' : 'Belum diisi'}
                  </dd>
                </div>
              </dl>

              {confirmReset ? (
                <div className="mt-5 rounded-2xl border border-rose-200/80 bg-rose-50/80 p-3.5">
                  <p className="text-xs leading-relaxed text-rose-700">
                    Hapus semua override database? Konfigurasi akan kembali ke environment.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={resetting}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      {resetting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                      {resetting ? 'Meriset...' : 'Ya, reset'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      disabled={resetting}
                      className="rounded-xl border border-rose-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-white"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  disabled={!settings.usingDatabase}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200/80 disabled:text-slate-400 disabled:hover:bg-white/80"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset ke environment
                </button>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
