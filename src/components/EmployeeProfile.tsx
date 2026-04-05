import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Edit, Edit2, Edit3, Trash2, Phone, MessageSquare, BadgeCheck, Building2, Calendar, User, DollarSign, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Employee, Attendance } from '@/src/types';
import { cn, formatTime, formatDate } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [details, setDetails] = useState<{id: number, title: string, content: string, image_data: string, created_at: string}[]>([]);
  const [editingAllowanceId, setEditingAllowanceId] = useState<number | null>(null);

  useEffect(() => {
    if (id && id !== 'undefined') {
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

      handleFetch(`/api/employees/${id}`, setEmployee);
      handleFetch(`/api/employees/${id}/details`, setDetails);
      handleFetch(`/api/attendance`, (data) => {
        if (Array.isArray(data)) {
          setLogs(data.filter((l: Attendance) => l.employee_id === Number(id)).slice(0, 5));
        }
      });
    }
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        const res = await fetchWithAuth(`/api/employees/${id}`, { method: 'DELETE' });
        if (res.ok) {
          window.location.href = '/directory';
        } else {
          alert('Failed to delete employee');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred');
      }
    }
  };

  const handleUpdateAllowance = async (logId: number, allowance: number) => {
    try {
      const res = await fetchWithAuth(`/api/attendance/${logId}/allowance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowance: Number(allowance) })
      });
      if (res.ok) {
        const updatedLog = await res.json();
        setLogs(prev => prev.map(l => l.id === logId ? { ...l, allowance: Number(updatedLog.allowance) } : l));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!employee) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-on-surface-variant text-sm mb-6 font-medium">
        <Link to="/directory" className="hover:text-primary">Employee</Link>
        <ChevronRight size={14} />
        <span className="text-primary">Employee Profile</span>
      </nav>

      {/* Profile Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start"
        >
          <div className="relative group">
            <div className="w-40 h-40 rounded-full border-4 border-surface-container-high overflow-hidden">
              <img 
                alt={employee.name} 
                className="w-full h-full object-cover" 
                src={employee.avatar_url}
                referrerPolicy="no-referrer"
              />
            </div>
            <button className="absolute bottom-1 right-1 bg-primary text-on-primary p-2 rounded-full shadow-lg active:scale-95 transition-transform">
              <Edit size={16} />
            </button>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="mb-4">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-1 block">{employee.role}</span>
              <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight">{employee.name}</h2>
              <p className="text-on-surface-variant italic font-medium">"{employee.nickname}"</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
              <button className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95">
                <Calendar size={18} />
                Record Attendance
              </button>
              <Link 
                to={`/directory?edit=${employee.id}`}
                className="flex items-center gap-2 bg-surface-container-high text-on-surface-variant px-5 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95"
              >
                <Edit3 size={18} />
                Edit Profile
              </Link>
              <button 
                onClick={handleDelete}
                className="flex items-center gap-2 border border-error/20 text-error px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:bg-error/5 active:scale-95"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 bg-primary text-on-primary-container rounded-xl p-8 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary-container to-blue-400 opacity-20"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-6">Employment Status</p>
            <div className="space-y-4">
              <div>
                <p className="text-sm opacity-80">Joined Date</p>
                <p className="font-headline text-lg font-bold">{formatDate(employee.join_date)}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Employee ID</p>
                <p className="font-headline text-lg font-bold">#{employee.employee_id}</p>
              </div>
            </div>
          </div>
          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full", employee.status === 'On-Duty' ? "bg-emerald-400" : "bg-slate-400")}></div>
            <span className="text-sm font-semibold text-white">Currently {employee.status}</span>
          </div>
        </motion.div>
      </div>

      {/* Bento Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Communication */}
        <div className="bg-surface-container-lowest rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Phone size={20} />
            </div>
            <h3 className="font-headline font-bold text-on-surface">Contact Information</h3>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Mobile Number</p>
              <p className="text-on-surface font-semibold text-lg">{employee.mobile}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">WhatsApp</p>
              <div className="flex items-center gap-2">
                <MessageSquare className="text-emerald-500" size={20} />
                <p className="text-on-surface font-semibold text-lg">{employee.whatsapp}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="bg-surface-container-lowest rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <BadgeCheck size={20} />
            </div>
            <h3 className="font-headline font-bold text-on-surface">Legal & Identity</h3>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">NIC Number</p>
              <p className="text-on-surface font-semibold text-lg">{employee.nic}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tax Residency</p>
              <p className="text-on-surface font-semibold text-lg">{employee.tax_residency}</p>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="bg-surface-container-lowest rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-slate-200/50 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Building2 size={20} />
            </div>
            <h3 className="font-headline font-bold text-on-surface">Organization Details</h3>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Section</p>
              <div className="relative">
                <select 
                  defaultValue={employee.section}
                  className="w-full bg-surface-container-highest border-none rounded-lg text-sm font-medium py-3 px-4 appearance-none focus:ring-2 focus:ring-primary"
                >
                  <option>Customer Relations</option>
                  <option>Human Resources</option>
                  <option>Operations & Logistics</option>
                  <option>Finance Control</option>
                </select>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Salary Details</p>
              <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl mb-3">
                <button className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg",
                  employee.salary_type === 'Daily' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"
                )}>Daily</button>
                <button className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg",
                  employee.salary_type === 'Monthly' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"
                )}>Monthly</button>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Amount</p>
                <p className="text-on-surface font-bold text-lg">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(employee.salary || 0).replace('LKR', 'Rs.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details & Documents */}
      {details.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-xl text-on-surface">Additional Documents & Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {details.map((detail) => (
              <motion.div 
                key={detail.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-headline font-bold text-primary">{detail.title}</h4>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">{formatDate(detail.created_at)}</span>
                </div>
                {detail.content && (
                  <p className="text-sm text-on-surface-variant leading-relaxed">{detail.content}</p>
                )}
                {detail.image_data && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-outline-variant/20">
                    <img 
                      src={detail.image_data} 
                      alt={detail.title} 
                      className="w-full h-auto object-contain max-h-[300px] bg-surface-container-low" 
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Logs */}
      <div className="mt-8 bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-surface-container-high flex justify-between items-center">
          <h3 className="font-headline font-bold text-on-surface">Recent Activity Logs</h3>
          <button className="text-primary text-sm font-bold hover:underline">View Detailed Logs</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Check-in</th>
                <th className="px-8 py-4">Check-out</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Salary (Rs.)</th>
                <th className="px-8 py-4">Allowance (Rs.)</th>
                <th className="px-8 py-4 text-right">Total (Rs.)</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {logs.map((log) => {
                const baseDailySalary = employee.salary_type === 'Daily' ? (employee.salary || 0) : (employee.salary || 0) / 30;
                const dailySalary = log.status === 'Half-Day' ? baseDailySalary / 2 : baseDailySalary;
                const totalPayment = dailySalary + (Number(log.allowance) || 0);
                
                return (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-8 py-4 border-t border-surface-container-low">{formatDate(log.date)}</td>
                    <td className="px-8 py-4 border-t border-surface-container-low">{formatTime(log.check_in)}</td>
                    <td className="px-8 py-4 border-t border-surface-container-low">{formatTime(log.check_out)}</td>
                    <td className="px-8 py-4 border-t border-surface-container-low">
                      <span className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded uppercase",
                        log.status === 'Present' ? "bg-emerald-50 text-emerald-700" : 
                        log.status === 'Half-Day' ? "bg-amber-50 text-amber-700" :
                        "bg-slate-50 text-slate-700"
                      )}>{log.status}</span>
                    </td>
                    <td className="px-8 py-4 border-t border-surface-container-low font-medium">
                      Rs. {dailySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-4 border-t border-surface-container-low">
                      <div className="flex items-center gap-2 group/allowance">
                        <div className="relative flex items-center">
                          {editingAllowanceId === log.id ? (
                            <input 
                              type="number"
                              defaultValue={log.allowance || 0}
                              autoFocus
                              onBlur={(e) => {
                                handleUpdateAllowance(log.id, Number(e.target.value));
                                setEditingAllowanceId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateAllowance(log.id, Number((e.target as HTMLInputElement).value));
                                  setEditingAllowanceId(null);
                                }
                                if (e.key === 'Escape') {
                                  setEditingAllowanceId(null);
                                }
                              }}
                              className="w-24 bg-surface-container-highest border-none rounded pl-2 pr-2 py-1 text-xs font-bold focus:ring-1 focus:ring-primary transition-all"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{log.allowance || 0}</span>
                              <button 
                                onClick={() => setEditingAllowanceId(log.id)}
                                className="p-1 hover:bg-surface-container-high rounded transition-colors"
                              >
                                <Edit2 size={12} className="text-on-surface-variant opacity-40 group-hover/allowance:opacity-100 transition-opacity" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 border-t border-surface-container-low text-right font-bold text-primary">
                      Rs. {totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
