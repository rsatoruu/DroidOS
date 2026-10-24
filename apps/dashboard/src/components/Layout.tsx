import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AppWindow, FolderOpen, Container, Activity,
  Settings, LogOut, Bot, Menu, X, ChevronRight, ShoppingBag, Terminal, FileText,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/store', icon: ShoppingBag, label: 'App Store' },
  { to: '/apps', icon: AppWindow, label: 'Applications' },
  { to: '/files', icon: FolderOpen, label: 'Files' },
  { to: '/terminal', icon: Terminal, label: 'Terminal' },
  { to: '/logs', icon: FileText, label: 'Logs' },
  { to: '/docker', icon: Container, label: 'Docker' },
  { to: '/monitoring', icon: Activity, label: 'Monitoring' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-600">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30">
          <Bot className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">DroidOS</div>
          <div className="text-xs text-slate-500">Home Server</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-brand-300 bg-brand-500/10 border border-brand-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-700'
              }`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-surface-600 p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-brand-300">
              {user?.username?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.username ?? 'Admin'}</div>
            <div className="text-xs text-slate-500">Administrator</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-surface-800 border-r border-surface-600">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-surface-800 border-r border-surface-600 animate-slide-up">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-surface-800 border-b border-surface-600 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-brand-400" />
            <span className="font-semibold text-white text-sm">DroidOS</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
