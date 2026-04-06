import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Grid, Users, Timer, CalendarOff, Settings, Bell, LogOut, Building2, CreditCard, Sun, Moon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';

const TopBar = ({ onLogout }: { onLogout?: () => void }) => {
  const user: User = JSON.parse(localStorage.getItem('ems_user') || '{}');
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full top-0 sticky bg-surface-container-lowest z-30 border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-6 py-2 md:py-3 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
        </div>
        <div className="flex items-center gap-6">
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
          </div>
        </div>
      </div>
    </header>
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
      <div className="flex flex-col min-h-screen">
        <TopBar onLogout={onLogout} />
        <main className="flex-1 p-4 md:p-8 pt-2 md:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
};
