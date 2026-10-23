import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InstallAppButton from './InstallAppButton';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/ideas', label: 'Daftar Ide', icon: Lightbulb, end: false },
  { to: '/recommendations', label: 'Rekomendasi', icon: Sparkles, end: false },
];

function navClass({ isActive }) {
  return [
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

export default function AppLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 px-6">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900">BankIde</p>
            <p className="text-xs text-slate-400">Ide menjadi eksekusi</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <InstallAppButton />
          <p className="truncate px-2 text-xs text-slate-400">{admin?.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
              <Lightbulb className="h-4 w-4" />
            </span>
            <span className="font-semibold text-slate-900">BankIde</span>
          </div>
          <div className="flex items-center gap-1">
            <InstallAppButton variant="icon" />
            <button
              type="button"
              onClick={handleLogout}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
              aria-label="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="w-full px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => [
                  'flex min-w-20 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition',
                  isActive ? 'text-indigo-600' : 'text-slate-500',
                ].join(' ')}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
