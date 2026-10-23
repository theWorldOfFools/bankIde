import { useEffect, useState } from 'react';
import { Bell, BellOff, LoaderCircle } from 'lucide-react';
import { enablePush } from '../lib/push';

export default function PushToggle() {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return undefined;
    }

    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve(null), 2500);
    });

    Promise.race([navigator.serviceWorker.ready, timeout])
      .then(async (registration) => {
        if (!active || !registration) return;
        const subscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(subscription) && Notification.permission === 'granted');
        setVisible(true);
      })
      .catch(() => {
        if (active) setVisible(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleEnable() {
    setLoading(true);
    setError('');
    try {
      await enablePush();
      setEnabled(true);
    } catch (pushError) {
      setError(pushError.message);
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  if (enabled) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">
        <Bell className="h-4 w-4" />
        Notifikasi aktif
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        Aktifkan notifikasi
      </button>
      {error && (
        <p className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-rose-200 bg-white p-3 text-xs text-rose-600 shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}
