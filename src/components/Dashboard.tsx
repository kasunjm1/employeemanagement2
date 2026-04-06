import React, { useEffect, useState } from 'react';
import { TrendingUp, CheckCircle, XCircle, FolderOpen, Clock, Umbrella, BarChart3, AlertTriangle, Check, PartyPopper, Calendar, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { DashboardStats, Alert, Leave } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<Leave[]>([]);

  useEffect(() => {
    const handleFetch = (url: string, setter: (data: any) => void) => {
      fetchWithAuth(url)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${url}`);
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Received non-JSON response from ${url}`);
          }
          return res.json();
        })
        .then(data => {
          if (data && !data.error) setter(data);
        })
        .catch(err => {
          console.error(`Error fetching from ${url}:`, err);
        });
    };

    handleFetch('/api/stats', setStats);
    handleFetch('/api/alerts', setAlerts);
    handleFetch('/api/leaves', (data) => {
      if (Array.isArray(data)) setUpcomingLeaves(data.slice(0, 3));
    });
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-primary to-primary-container p-8 rounded-[2rem] shadow-lg text-on-primary"
        >
          <div className="relative z-10">
            <p className="font-body text-xs uppercase tracking-[0.2em] font-medium opacity-80 mb-2">Total Workforce</p>
            <h2 className="font-headline text-5xl font-extrabold mb-4">{stats?.totalWorkforce?.toLocaleString() || '0'}</h2>
            <div className="flex items-center gap-2 text-sm font-medium bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <TrendingUp size={16} />
              <span>{stats?.growth || '0%'} from last month</span>
            </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
            <Users size={192} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CheckCircle size={24} />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full uppercase">Present</span>
          </div>
          <div>
            <h3 className="font-headline text-3xl font-bold text-on-surface">{stats?.activeToday?.toLocaleString() || '0'}</h3>
            <p className="font-body text-xs text-on-surface-variant">Active today</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-error/10 rounded-lg text-error">
              <XCircle size={24} />
            </div>
            <span className="text-[10px] font-bold text-error bg-error/10 dark:bg-error/20 px-2 py-0.5 rounded-full uppercase">Absent</span>
          </div>
          <div>
            <h3 className="font-headline text-3xl font-bold text-on-surface">{stats?.absentToday?.toLocaleString() || '0'}</h3>
            <p className="font-body text-xs text-on-surface-variant">No show reported</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Operations Section */}
        <div className="lg:col-span-8 space-y-8">
          {/* EMS Modules */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl font-bold text-on-surface">EMS Modules</h2>
              <Link to="/modules" className="text-primary font-bold text-sm hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: FolderOpen, label: 'Employee', path: '/directory' },
                { icon: Clock, label: 'Attendance', path: '/attendance' },
                { icon: Umbrella, label: 'Leave Mgmt', path: '/leave' },
                { icon: BarChart3, label: 'Reports', path: '#' },
              ].map((module, i) => (
                <motion.div 
                  key={module.label}
                  whileHover={{ y: -5 }}
                >
                  <Link 
                    to={module.path}
                    className="group block bg-surface-container-low hover:bg-surface-container-highest transition-all p-6 rounded-xl cursor-pointer"
                  >
                    <module.icon className="text-primary mb-4 group-hover:scale-110 transition-transform" size={24} />
                    <p className="font-body text-sm font-semibold text-on-surface">{module.label}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Priority Alerts */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl font-bold text-on-surface">Priority Alerts</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                <span className="text-[10px] font-bold text-error uppercase">Live Updates</span>
              </div>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-container-high transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      alert.type === 'warning' ? "bg-error/10 text-error" : 
                      alert.type === 'approval' ? "bg-secondary-container/20 text-secondary" : 
                      "bg-primary-container/10 text-primary"
                    )}>
                      {alert.type === 'warning' && <AlertTriangle size={20} />}
                      {alert.type === 'approval' && <Check size={20} />}
                      {alert.type === 'celebration' && <PartyPopper size={20} />}
                    </div>
                    <div>
                      <p className="font-body text-sm font-semibold text-on-surface">{alert.title}</p>
                      <p className="font-body text-xs text-on-surface-variant">{alert.description}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Content */}
        <div className="lg:col-span-4 space-y-8">
          {/* Upcoming Leaves */}
          <div className="bg-surface-container-high/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-on-surface-variant" size={20} />
              <h2 className="font-headline text-lg font-bold text-on-surface">Upcoming Leaves</h2>
            </div>
            <div className="space-y-4">
              {upcomingLeaves.map((leave) => (
                <div key={leave.id} className="flex gap-4 items-start">
                  <div className="text-center w-12 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">
                      {new Date(leave.start_date).toLocaleString('default', { month: 'short' })}
                    </p>
                    <p className="text-lg font-extrabold text-primary">
                      {new Date(leave.start_date).getDate()}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-on-surface">{leave.name}</p>
                    <p className="text-xs text-on-surface-variant">{leave.type} • {leave.days} Days</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 border border-outline/20 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container-lowest transition-colors">
              Manage Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
