import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, ChevronRight, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 transition-colors duration-500">
      <div className="absolute top-6 right-6">
        <button 
          onClick={toggleTheme}
          className="text-on-surface-variant hover:bg-surface-container-high p-3 rounded-full transition-all shadow-sm bg-surface-container-lowest border border-outline-variant/10"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface-container-lowest rounded-[2.5rem] shadow-2xl shadow-primary/5 overflow-hidden border border-outline-variant/10"
      >
        <div className="p-10 md:p-12">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck size={32} className="text-primary" />
            </div>
            <h1 className="font-headline font-bold text-3xl text-on-surface tracking-tight">EMS Master</h1>
            <p className="font-body text-on-surface-variant text-sm mt-2">Precision Operational Oversight</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-12 pr-4 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  placeholder="alex.sterling@nexus.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Security Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-12 pr-4 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-error text-xs font-bold text-center">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-body font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access Command Center'}
              {!loading && <ChevronRight size={18} />}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-outline-variant/10 text-center">
            <p className="font-body text-[11px] text-on-surface-variant uppercase tracking-widest">
              Authorized Personnel Only • Level 4 Encryption
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
