import React, { useEffect, useState } from 'react';
import { TrendingUp, CheckCircle, XCircle, FolderOpen, Clock, Umbrella, BarChart3, AlertTriangle, Check, PartyPopper, Calendar, Users, ChevronRight, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { DashboardStats, Alert, Leave, ProjectAttendanceSummary, ProjectEmployeeAttendance } from '@/src/types';
import { cn, formatDate } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<Leave[]>([]);
  const [projectAttendance, setProjectAttendance] = useState<ProjectAttendanceSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectAttendanceSummary | null>(null);
  const [projectEmployees, setProjectEmployees] = useState<ProjectEmployeeAttendance[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

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
    handleFetch('/api/dashboard/project-attendance', setProjectAttendance);
    handleFetch('/api/leaves', (data) => {
      if (Array.isArray(data)) setUpcomingLeaves(data.slice(0, 3));
    });
  }, []);

  const handleProjectClick = (project: ProjectAttendanceSummary) => {
    setSelectedProject(project);
    setLoadingEmployees(true);
    fetchWithAuth(`/api/dashboard/project-attendance/${project.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProjectEmployees(data);
      })
      .catch(err => console.error("Error fetching project employees:", err))
      .finally(() => setLoadingEmployees(false));
  };

  return (
    <div className="space-y-10">
      {/* Main Grid: Stats & Attendance (Left) + Quick Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Hero Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-container p-5 rounded-[2rem] shadow-xl text-on-primary"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <p className="font-body text-[10px] uppercase tracking-wider font-medium opacity-80 mb-1">Total Workforce</p>
                  <h2 className="font-headline text-3xl font-extrabold">{stats?.totalWorkforce?.toLocaleString() || '0'}</h2>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="font-body text-[10px] uppercase tracking-wider font-medium opacity-80 mb-1">Active Now</p>
                  <h2 className="font-headline text-3xl font-extrabold">{stats?.activeToday || 0}</h2>
                </div>
              </div>
              <div className="hidden sm:flex bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <Users size={24} className="opacity-80" />
              </div>
            </div>
            <div className="absolute right-[-30px] bottom-[-30px] opacity-10 rotate-12">
              <Users size={150} />
            </div>
          </motion.div>

          {/* Daily Project Attendance */}
          <section className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <CheckCircle size={20} />
                </div>
                <h2 className="font-headline text-xl font-bold text-on-surface">Attendance Summary</h2>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/10">
                <Calendar size={14} className="text-on-surface-variant" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {formatDate(new Date())}
                </span>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em]">Project Name</th>
                      <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] text-right"># Employees</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {projectAttendance.map((project) => (
                      <tr 
                        key={project.id} 
                        className="group hover:bg-surface-container-low transition-all cursor-pointer"
                        onClick={() => handleProjectClick(project)}
                      >
                        <td className="px-8 py-3">
                          <span className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{project.name}</span>
                        </td>
                        <td className="px-8 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-lg font-extrabold text-on-surface">{project.total}</span>
                            <div className="p-1.5 rounded-full bg-surface-container-high text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {projectAttendance.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-8 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-30">
                            <Clock size={48} />
                            <p className="text-sm font-medium">No project attendance data available for today.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <section className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <TrendingUp size={20} />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Quick Actions</h2>
            </div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8 space-y-4"
            >
              {[
                { icon: Users, label: 'Add New Employee', path: '/directory', color: 'text-primary bg-primary/10' },
                { icon: Calendar, label: 'Log Attendance', path: '/attendance', color: 'text-emerald-500 bg-emerald-500/10' },
                { icon: Umbrella, label: 'Review Leaves', path: '/leave', color: 'text-amber-500 bg-amber-500/10' },
                { icon: BarChart3, label: 'View Reports', path: '#', color: 'text-purple-500 bg-purple-500/10' },
              ].map((action) => (
                <Link 
                  key={action.label}
                  to={action.path}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-container-low transition-all group"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", action.color)}>
                    <action.icon size={18} />
                  </div>
                  <span className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{action.label}</span>
                  <ChevronRight size={16} className="ml-auto text-outline opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-outline-variant/10">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">System Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-on-surface">All systems operational</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </div>


      <div className="space-y-12">
        {/* EMS Modules */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <BarChart3 size={20} />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Core EMS Modules</h2>
            </div>
            <Link to="/modules" className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest rounded-xl text-primary font-bold text-sm transition-colors">
              Explore All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: FolderOpen, label: 'Employee Directory', path: '/directory', color: 'bg-primary/10 text-primary' },
              { icon: Clock, label: 'Attendance Logs', path: '/attendance', color: 'bg-emerald-500/10 text-emerald-500' },
              { icon: Umbrella, label: 'Leave Management', path: '/leave', color: 'bg-amber-500/10 text-amber-500' },
              { icon: BarChart3, label: 'Analytics Reports', path: '#', color: 'bg-purple-500/10 text-purple-500' },
            ].map((module, i) => (
              <motion.div 
                key={module.label}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link 
                  to={module.path}
                  className="group block bg-surface-container-lowest hover:shadow-xl hover:shadow-primary/5 border border-outline-variant/10 transition-all p-8 rounded-[2rem] cursor-pointer"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", module.color)}>
                    <module.icon size={24} />
                  </div>
                  <p className="font-headline text-base font-bold text-on-surface mb-1">{module.label}</p>
                  <p className="text-xs text-on-surface-variant opacity-70">Manage and track {module.label.toLowerCase()}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Project Employee List Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
                <div>
                  <h3 className="font-headline text-xl font-bold text-on-surface">{selectedProject.name}</h3>
                  <p className="text-xs text-on-surface-variant">Daily Attendance List • {formatDate(new Date())}</p>
                </div>
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingEmployees ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-on-surface-variant">Loading workforce data...</p>
                  </div>
                ) : projectEmployees.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {projectEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`} 
                              alt={emp.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                              emp.status === 'Full-Day' ? "bg-emerald-500" : 
                              emp.status === 'Half-Day' ? "bg-amber-500" : "bg-error"
                            )} />
                          </div>
                          <div>
                            <p className="font-body text-sm font-bold text-on-surface">{emp.name}</p>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{emp.employee_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            emp.status === 'Full-Day' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : 
                            emp.status === 'Half-Day' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : 
                            "bg-error/10 text-error"
                          )}>
                            {emp.status}
                          </span>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-medium text-on-surface-variant">
                            <Clock size={10} />
                            <span>{emp.check_in || '--:--'} - {emp.check_out || '--:--'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Users className="mx-auto text-on-surface-variant/20 mb-4" size={48} />
                    <p className="text-on-surface-variant">No employees found for this project today.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-end">
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
