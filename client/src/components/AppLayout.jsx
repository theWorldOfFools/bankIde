import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  ChevronRight,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Sparkles,
  Users,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import InstallAppButton from './InstallAppButton';

const baseNavigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/ideas', label: 'Daftar Ide', icon: Lightbulb, end: false },
  { to: '/insights', label: 'Insight', icon: BrainCircuit, end: false },
  { to: '/recommendations', label: 'Rekomendasi', icon: Sparkles, end: false },
];

const adminNavigation = [
  { to: '/admin/users', label: 'Kelola User', icon: Users, end: false },
];

const pageTitles = {
  '/': 'Dashboard',
  '/ideas': 'Daftar Ide',
  '/insights': 'Insight Produktivitas',
  '/recommendations': 'Rekomendasi',
  '/admin/users': 'Kelola User',
};

function AmbientBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="aurora-grid absolute inset-0 opacity-70" />
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -24, 0], x: [0, 16, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-indigo-400/20 blur-[100px]"
      />
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, 26, 0], x: [0, -18, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-20 top-[18%] h-[24rem] w-[24rem] rounded-full bg-fuchsia-400/15 blur-[100px]"
      />
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-18%] left-[35%] h-[26rem] w-[26rem] rounded-full bg-sky-400/15 blur-[110px]"
      />
    </div>
  );
}

function SidebarNavLink({ item }) {
  const Icon = item.icon;

  return (
    <NavLink to={item.to} end={item.end}>
      {({ isActive }) => (
        <span className="relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors">
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-2xl bg-slate-950 shadow-xl shadow-slate-900/25"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Icon className={`relative h-[18px] w-[18px] ${isActive ? 'text-white' : 'text-slate-400'}`} />
          <span className={`relative ${isActive ? 'text-white' : 'text-slate-500'}`}>
            {item.label}
          </span>
          {isActive && (
            <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          )}
        </span>
      )}
    </NavLink>
  );
}

function MobileNavLink({ item }) {
  const Icon = item.icon;

  return (
    <NavLink to={item.to} end={item.end} className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="mobile-active"
              className="absolute inset-0 rounded-2xl bg-slate-950"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Icon className={`relative h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
          <span className={`relative ${isActive ? 'text-white' : 'text-slate-500'}`}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = isAdmin ? [...baseNavigation, ...adminNavigation] : baseNavigation;
  const pageTitle = pageTitles[location.pathname] || 'Workspace';
  const initials = (user?.email || 'BI').slice(0, 2).toUpperCase();
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-canvas">
      <AmbientBackground />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/60 bg-white/70 backdrop-blur-2xl lg:flex">
        <div className="px-6 pb-6 pt-7">
          <NavLink to="/" className="group flex items-center gap-3">
            <motion.span
              whileHover={{ rotate: -7, scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-500/30"
            >
              <Lightbulb className="h-5 w-5" />
              <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/35" />
            </motion.span>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-950">BankIde</p>
              <p className="text-[11px] font-medium text-slate-400">Ide menjadi eksekusi</p>
            </div>
          </NavLink>
        </div>

        <div className="mx-4 mb-5 rounded-2xl border border-white/70 bg-white/60 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-emerald-500" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Workspace aktif
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800">{pageTitle}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{today}</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Ruang kerja
          </p>
          {navigation.map((item) => (
            <SidebarNavLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="m-4 rounded-2xl border border-white/70 bg-white/65 p-3.5 shadow-sm">
          <InstallAppButton />
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-700 text-[11px] font-bold text-white shadow-lg shadow-slate-900/20">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">{user?.email}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">
                {isAdmin ? 'Admin' : 'User'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/60 bg-white/70 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
              <Lightbulb className="h-4 w-4" />
            </span>
            <span className="font-bold tracking-tight text-slate-950">BankIde</span>
          </div>
          <div className="flex items-center gap-1">
            <InstallAppButton variant="icon" />
            <button
              type="button"
              onClick={handleLogout}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-white/50 bg-[#f5f6fb]/70 px-8 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Workspace</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-slate-700">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sistem normal
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-700 text-[11px] font-bold text-white shadow-lg shadow-slate-900/20">
              {initials}
            </span>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1480px] px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/80 px-3 pt-2 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around gap-1">
          {navigation.map((item) => (
            <MobileNavLink key={item.to} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
