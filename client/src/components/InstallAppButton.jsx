import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    function handleBeforeInstall(event) {
      event.preventDefault();
      setPromptEvent(event);
    }

    function handleInstalled() {
      setPromptEvent(null);
      setInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return { canInstall: Boolean(promptEvent) && !installed, install };
}

export default function InstallAppButton({ variant = 'sidebar' }) {
  const { canInstall, install } = useInstallPrompt();

  if (!canInstall) return null;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={install}
        className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100"
        aria-label="Pasang aplikasi"
        title="Pasang aplikasi"
      >
        <Download className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={install}
      className="mb-2 flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
    >
      <Download className="h-4 w-4" />
      Pasang Aplikasi
    </button>
  );
}
