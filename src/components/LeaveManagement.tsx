import React, { useEffect, useState } from 'react';
import { PlusCircle, Umbrella, Stethoscope, Briefcase, Baby, ChevronRight, Calendar, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Leave } from '@/src/types';
import { cn, formatDate } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [stats, setStats] = useState({
    total: 24,
    used: 0,
    remaining: 24
  });

  useEffect(() => {
    fetchWithAuth('/api/leaves')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch leaves');
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Received non-JSON response from server');
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setLeaves(data);
          const used = data.filter(l => l.status === 'Approved').reduce((acc, l) => acc + (l.days || 0), 0);
          setStats(prev => ({
            ...prev,
            used,
            remaining: prev.total - used
          }));
        }
      })
      .catch(err => {
        console.error('Error fetching leaves:', err);
      });
  }, []);

  const getIcon = (type: string) => {
    if (type.includes('Vacation')) return Umbrella;
    if (type.includes('Medical')) return Stethoscope;
    if (type.includes('Personal')) return Briefcase;
    if (type.includes('Paternity')) return Baby;
    return Umbrella;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-body text-[0.6875rem] font-bold text-on-surface-variant tracking-widest uppercase block mb-1">Human Resources</span>
          <h2 className="font-headline font-bold text-3xl text-on-surface tracking-tight">Leave Management</h2>
        </div>
        <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-body font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
          <PlusCircle size={20} />
          <span>Request Leave</span>
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <p className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Allowance</p>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-extrabold text-4xl text-on-surface">{stats.total}</span>
            <span className="font-body text-sm text-on-surface-variant">Days / Year</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl">
          <p className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Leave Used</p>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-extrabold text-4xl text-on-surface">{stats.used}</span>
            <span className="font-body text-sm text-on-surface-variant">Days taken</span>
          </div>
          <div className="mt-4 w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(stats.used / stats.total) * 100}%` }}></div>
          </div>
        </div>

        <div className="bg-primary text-on-primary p-6 rounded-xl shadow-xl shadow-primary/10">
          <p className="font-body text-xs font-bold opacity-70 uppercase tracking-wider mb-2">Remaining Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-extrabold text-4xl">{stats.remaining}</span>
            <span className="font-body text-sm opacity-80">Days left</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-xl text-on-surface">Leave History</h3>
            <span className="text-xs font-medium text-on-surface-variant px-3 py-1 bg-surface-container rounded-full">All Requests</span>
          </div>
          <div className="space-y-3">
            {leaves.map((leave) => {
              const Icon = getIcon(leave.type);
              return (
                <div key={leave.id} className="bg-surface-container-lowest hover:bg-surface-container-high p-4 rounded-xl flex items-center justify-between group transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center">
                      <Icon className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-body font-semibold text-on-surface">{leave.type}</h4>
                      <p className="font-body text-[13px] text-on-surface-variant">
                        {formatDate(leave.start_date)} — {formatDate(leave.end_date)} ({leave.days} days)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tighter">Applied on</p>
                      <p className="text-[13px] text-on-surface">{formatDate(leave.applied_on)}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-bold uppercase",
                      leave.status === 'Approved' ? "bg-green-100 text-green-700" : 
                      leave.status === 'Pending' ? "bg-orange-100 text-orange-700" : 
                      "bg-red-100 text-red-700"
                    )}>{leave.status}</span>
                    <ChevronRight className="text-outline-variant group-hover:text-primary transition-colors" size={20} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-high/40 p-6 rounded-xl space-y-6">
            <h3 className="font-headline font-bold text-lg text-on-surface">Upcoming Holidays</h3>
            <div className="space-y-4">
              <p className="text-xs text-on-surface-variant italic">No upcoming holidays scheduled.</p>
            </div>
            <div className="pt-4 border-t border-outline-variant/10">
              <button className="text-primary font-body font-bold text-xs flex items-center gap-1 hover:underline">
                View Full Holiday Calendar
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-primary" />
              <h3 className="font-headline font-bold text-lg text-on-surface">Policy Reminder</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              All annual leave requests must be submitted at least <span className="font-bold text-on-surface">2 weeks</span> in advance. Medical certificates are required for sick leave exceeding 2 consecutive days.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LeaveManagement;
