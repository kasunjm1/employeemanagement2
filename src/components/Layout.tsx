import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Grid, Users, Timer, CalendarOff, Settings, Bell, LogOut, Building2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User } from '../types';

const Sidebar = ({ onLogout }: { onLogout?: () => void }) => {
  const user: User = JSON.parse(localStorage.getItem('ems_user') || '{}');

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Grid, label: 'Modules', path: '/modules' },
    { icon: Users, label: 'Employee', path: '/directory' },
    { icon: Timer, label: 'Attendance', path: '/attendance' },
    { icon: CalendarOff, label: 'Leave', path: '/leave' },
  ];

  if (user.role === 'admin' || user.role === 'super_admin') {
    navItems.push({ icon: Settings, label: 'Settings', path: '/settings' });
  }

  if (user.role === 'super_admin') {
    navItems.push({ icon: Building2, label: 'Accounts', path: '/accounts' });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen z-40 hidden md:flex flex-col w-72 bg-slate-50 dark:bg-slate-900 border-r border-outline-variant/10">
      <div className="p-8 flex flex-col gap-2 border-b border-outline-variant/10">
        <div className="font-headline font-extrabold text-blue-800 dark:text-blue-300 text-2xl tracking-tight uppercase">EMS MASTER</div>
        <div className="flex items-center gap-3 mt-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary font-bold text-xl">
            {user.name?.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="font-body text-sm font-bold text-on-surface truncate">{user.name}</p>
            <p className="font-body text-[11px] text-on-surface-variant uppercase tracking-wider truncate">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3 rounded-lg font-body text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-4 border-blue-700" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:pl-6"
            )}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-6 space-y-4">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg font-body text-sm font-medium text-error hover:bg-error/5 transition-all"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
        <div className="bg-surface-container-high rounded-xl p-4">
          <p className="font-body text-[10px] uppercase font-bold text-on-surface-variant mb-1">Access Level</p>
          <p className="font-headline font-bold text-on-surface capitalize">{user.role.replace('_', ' ')}</p>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ onLogout }: { onLogout?: () => void }) => {
  const user: User = JSON.parse(localStorage.getItem('ems_user') || '{}');

  return (
    <header className="w-full top-0 sticky bg-slate-50 dark:bg-slate-900 z-30 border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <h1 className="font-headline font-bold text-xl tracking-tight text-blue-700 dark:text-blue-400">EMS Command</h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8">
            <NavLink to="/" className="text-blue-700 dark:text-blue-400 font-semibold transition-colors">Dashboard</NavLink>
            <NavLink to="/directory" className="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors">Employee</NavLink>
            {user.role !== 'standard' && (
              <NavLink to="/settings" className="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors">Settings</NavLink>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <button className="text-on-surface-variant hover:bg-slate-200/50 p-2 rounded-full transition-colors">
              <Bell size={20} />
            </button>
            <button 
              onClick={onLogout}
              className="md:hidden text-error hover:bg-error/5 p-2 rounded-full transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const BottomNav = () => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/' },
    { icon: Users, label: 'Employee', path: '/directory' },
    { icon: Timer, label: 'Logs', path: '/attendance' },
    { icon: CalendarOff, label: 'Leave', path: '/leave' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 md:hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)] border-t border-slate-200 dark:border-slate-800">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center transition-transform duration-200 active:scale-90",
            isActive 
              ? "bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl px-4 py-1" 
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          <item.icon size={20} />
          <span className="font-body text-[11px] font-semibold tracking-wide uppercase">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export const Layout = ({ children, onLogout }: { children: React.ReactNode, onLogout?: () => void }) => {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar onLogout={onLogout} />
      <div className="md:ml-72 flex flex-col min-h-screen">
        <TopBar onLogout={onLogout} />
        <main className="flex-1 p-6 md:p-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
