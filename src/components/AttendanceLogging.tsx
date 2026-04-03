import React, { useEffect, useState } from 'react';
import { UserPlus, Calendar, CheckCircle2, Clock, XCircle, ChevronRight, Factory, LogIn, LogOut, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { Employee, Attendance } from '@/src/types';
import { cn, formatTime } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const AttendanceLogging = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentLogs, setRecentLogs] = useState<Attendance[]>([]);
  const [sections, setSections] = useState<{id: number, name: string}[]>([]);
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0
  });
  const [formData, setFormData] = useState({
    employee_id: '',
    section: '',
    check_in: '',
    check_out: '',
    date: new Date().toISOString().split('T')[0]
  });

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
          if (Array.isArray(data)) setter(data);
        })
        .catch(err => {
          console.error(`Error fetching from ${url}:`, err);
        });
    };

    handleFetch('/api/employees', setEmployees);
    handleFetch('/api/attendance', (data) => setRecentLogs(data.slice(0, 5)));
    handleFetch('/api/sections', (data) => {
      setSections(data);
      if (data.length > 0) setFormData(prev => ({ ...prev, section: data[0].name }));
    });
    
    fetchWithAuth('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStats({
            present: data.activeToday || 0,
            late: 0, // No late stat in API yet
            absent: data.absentToday || 0
          });
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'Present'
        })
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const newLog = await res.json();
          setRecentLogs([newLog, ...recentLogs].slice(0, 5));
          setFormData({ ...formData, employee_id: '', check_in: '', check_out: '' });
        }
      }
    } catch (err) {
      console.error('Error submitting attendance:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <span className="font-body text-[11px] font-semibold tracking-widest uppercase text-on-surface-variant">Daily Operations</span>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Daily Attendance Logging</h2>
          <p className="text-on-surface-variant max-w-md font-body leading-relaxed">Swiftly record entry and exit times for on-site personnel with section assignment.</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low px-5 py-3 rounded-2xl">
          <Calendar className="text-primary" size={20} />
          <div className="flex flex-col">
            <span className="text-xs font-bold font-body text-on-surface-variant uppercase tracking-tighter">Current Shift Date</span>
            <span className="text-sm font-bold text-on-surface">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-[0_12px_32px_-4px_rgba(25,28,30,0.04)]"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center">
                  <UserPlus className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold">New Entry</h3>
              </div>
              <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Manual Override</span>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
              <div className="md:col-span-2 space-y-3">
                <label className="block font-body text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Select Employee</label>
                <select 
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                >
                  <option value="">Search or select staff...</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>{emp.name} - {emp.section}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block font-body text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Working Section</label>
                <div className="relative">
                  <select 
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all appearance-none"
                  >
                    {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <Factory className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline" size={20} />
                </div>
              </div>

              <div className="hidden md:block"></div>

              <div className="space-y-3">
                <label className="block font-body text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">In Time</label>
                <div className="relative">
                  <input 
                    type="time"
                    value={formData.check_in}
                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                  />
                  <LogIn className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline" size={20} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block font-body text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Out Time</label>
                <div className="relative">
                  <input 
                    type="time"
                    value={formData.check_out}
                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                  />
                  <LogOut className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline" size={20} />
                </div>
              </div>

              <div className="md:col-span-2 pt-6 flex justify-end">
                <button type="submit" className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-10 py-4 rounded-xl font-bold tracking-tight shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                  Save Entry
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-surface-container-low rounded-[2rem] p-8 space-y-6">
            <h3 className="font-headline font-bold text-lg text-on-surface">Real-time Pulse</h3>
            <div className="space-y-4">
              {[
                { label: 'Present', value: stats.present, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
                { label: 'Late Arrival', value: stats.late, icon: Clock, color: 'bg-amber-100 text-amber-700' },
                { label: 'Absent', value: stats.absent, icon: XCircle, color: 'bg-rose-100 text-rose-700' },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-container-lowest p-5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <span className="text-sm font-semibold text-on-surface">{stat.label}</span>
                  </div>
                  <span className="text-2xl font-black text-on-surface">{stat.value.toString().padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-headline font-bold text-lg px-2">Recent Submissions</h3>
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="group flex items-center gap-4 p-4 hover:bg-surface-container-high transition-colors rounded-2xl cursor-pointer">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                    <img alt={log.name} className="w-full h-full object-cover" src={log.avatar_url || 'https://picsum.photos/seed/user/200/200'} />
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="font-bold text-on-surface text-sm truncate">{log.name}</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">{formatTime(log.check_in)} • {log.section}</span>
                  </div>
                  <ChevronRight className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                </div>
              ))}
            </div>
            <button className="w-full py-3 text-xs font-bold text-primary-container bg-primary-fixed/50 rounded-xl uppercase tracking-widest hover:bg-primary-fixed transition-colors">View All Logs</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLogging;
