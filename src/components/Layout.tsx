import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Grid, Users, Timer, CalendarOff, Settings, Bell, LogOut, Building2, CreditCard, Sun, Moon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ onLogout }: { onLogout?: () => void }) => {
  const user: User = JSON.parse(localStorage.getItem('ems_user') || '{}');

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Grid, label: 'Modules', path: '/modules' },
    { icon: Users, label: 'Employee', path: '/directory' },
    { icon: Timer, label: 'Attendance', path: '/attendance' },
    { icon: CreditCard, label: 'Payroll', path: '/payroll' },
    { icon: CalendarOff, label: 'Leave', path: '/leave' },
  ];

  if (user.role === 'admin' || user.role === 'super_admin') {
    navItems.push({ icon: Settings, label: 'Settings', path: '/settings' });
  }

  if (user.role === 'super_admin') {
    navItems.push({ icon: Building2, label: 'Accounts', path: '/accounts' });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen z-40 hidden md:flex flex-col w-72 bg-surface-container-low border-r border-outline-variant/10">
      <div className="p-8 flex flex-col gap-2 border-b border-outline-variant/10">
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
                ? "bg-primary/10 text-primary border-r-4 border-primary" 
                : "text-on-surface-variant hover:bg-surface-container-high hover:pl-6"
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
      </div>
    </aside>
  );
};

const TopBar = ({ onLogout }: { onLogout?: () => void }) => {
  const user: User = JSON.parse(localStorage.getItem('ems_user') || '{}');
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full top-0 sticky bg-surface-container-lowest z-30 border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-6 py-2 md:py-3 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">
            EMS - {user.account_name || 'Command'}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8">
            <NavLink to="/" className="text-primary font-semibold transition-colors">Dashboard</NavLink>
            <NavLink to="/directory" className="text-on-surface-variant hover:text-primary transition-colors">Employee</NavLink>
            {user.role !== 'standard' && (
              <NavLink to="/settings" className="text-on-surface-variant hover:text-primary transition-colors">Settings</NavLink>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-colors">
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
    { icon: CreditCard, label: 'Payroll', path: '/payroll' },
    { icon: CalendarOff, label: 'Leave', path: '/leave' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 md:hidden bg-surface-container-lowest/70 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)] border-t border-outline-variant/10">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center transition-transform duration-200 active:scale-90",
            isActive 
              ? "bg-primary/10 text-primary rounded-xl px-4 py-1" 
              : "text-on-surface-variant"
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
  const user: User = JSON.parse(localStorage.getItem('ems_user') || '{}');

  React.useEffect(() => {
    if (user.account_name) {
      document.title = `EMS - ${user.account_name}`;
    } else {
      document.title = 'EMS MASTER';
    }
  }, [user.account_name]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar onLogout={onLogout} />
      <div className="md:ml-72 flex flex-col min-h-screen">
        <TopBar onLogout={onLogout} />
        <main className="flex-1 p-4 md:p-8 pt-2 md:pt-4">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
