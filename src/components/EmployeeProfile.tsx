import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Edit, Edit2, Edit3, Trash2, Phone, MessageSquare, BadgeCheck, Building2, Calendar, User, DollarSign, Plus, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Attendance } from '@/src/types';
import { cn, formatTime, formatDate } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [details, setDetails] = useState<{id: number, title: string, content: string, image_data: string, created_at: string}[]>([]);
  const [editingAllowanceId, setEditingAllowanceId] = useState<number | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [historyTab, setHistoryTab] = useState<'summary' | 'month'>('summary');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showCoreDetails, setShowCoreDetails] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    check_in: '08:00',
    check_out: '17:00',
    status: 'Present',
    allowance: 0
  });
  const [newAdvance, setNewAdvance] = useState({ amount: 0 });
  const [newLoan, setNewLoan] = useState({ amount: 0 });

  useEffect(() => {
    if (id && id !== 'undefined') {
      const handleFetch = (url: string, setter: (data: any) => void) => {
        fetchWithAuth(url)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && !data.error) setter(data);
          })
          .catch(err => console.error(`Error fetching from ${url}:`, err));
      };

      handleFetch(`/api/employees/${id}`, setEmployee);
      handleFetch(`/api/employees/${id}/details`, setDetails);
      handleFetch(`/api/attendance?employee_id=${id}`, setLogs);
      handleFetch(`/api/payroll/summary?month=${selectedMonth}&year=${selectedYear}`, (data) => {
        if (Array.isArray(data)) {
          const empSummary = data.find(e => e.id === Number(id));
          setPayrollSummary(empSummary);
        }
      });
      handleFetch(`/api/payroll/advances?employee_id=${id}`, setAdvances);
      handleFetch(`/api/payroll/loans?employee_id=${id}`, setLoans);
    }
  }, [id, selectedMonth, selectedYear]);

  const calculateActualSalary = (emp: any) => {
    if (!emp) return 0;
    const baseSalary = Number(emp.salary) || 0;
    if (emp.salary_type === 'Monthly') {
      return baseSalary + Number(emp.total_allowance || 0);
    } else {
      const presentPay = Number(emp.present_days || 0) * baseSalary;
      const halfDayPay = Number(emp.half_days || 0) * (baseSalary / 2);
      return presentPay + halfDayPay + Number(emp.total_allowance || 0);
    }
  };

  const handleAddAttendance = async () => {
    try {
      const res = await fetchWithAuth(`/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: Number(id), ...newLog })
      });
      if (res.ok) {
        const addedLog = await res.json();
        setLogs(prev => [addedLog, ...prev]);
        setShowAddModal(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddAdvance = async () => {
    try {
      const res = await fetchWithAuth(`/api/payroll/advances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: Number(id), amount: newAdvance.amount })
      });
      if (res.ok) {
        const added = await res.json();
        setAdvances(prev => [added, ...prev]);
        setShowAdvanceModal(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddLoan = async () => {
    try {
      const res = await fetchWithAuth(`/api/payroll/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employee_id: Number(id), 
          amount: newLoan.amount
        })
      });
      if (res.ok) {
        const added = await res.json();
        setLoans(prev => [added, ...prev]);
        setShowLoanModal(false);
      }
    } catch (err) { console.error(err); }
  };

  if (!employee) return <div className="flex items-center justify-center h-full">Loading...</div>;

  const actualSalary = calculateActualSalary(payrollSummary);
  const netPayable = actualSalary - Number(payrollSummary?.total_advances || 0) - Number(payrollSummary?.total_loan_installments || 0);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = logs.find(l => l.date.split('T')[0] === dateStr);
    return { day, dateStr, log };
  });

  const filteredLogs = logs.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Global Header */}
      <div className={cn(
        "relative flex flex-col md:flex-row items-start gap-6 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm transition-all duration-500",
        showCoreDetails && "ring-1 ring-primary/10 shadow-md"
      )}>
        <Link 
          to={`/directory?edit=${employee.id}`} 
          className="absolute top-4 right-4 p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-primary/10 hover:text-primary transition-all"
          title="Edit Profile"
        >
          <Edit3 size={18} />
        </Link>
        
        <div className="w-24 h-24 rounded-full border-4 border-primary/10 overflow-hidden shadow-md shrink-0">
          <img src={employee.avatar_url || `https://picsum.photos/seed/${employee.id}/200/200`} alt={employee.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1 text-center md:text-left w-full">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">{employee.name}</h1>
            <button 
              onClick={() => setShowCoreDetails(!showCoreDetails)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                showCoreDetails 
                  ? "bg-primary text-on-primary shadow-sm" 
                  : "bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary"
              )}
            >
              <User size={12} />
              {showCoreDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
            <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">{employee.employee_id}</span>
            <span className={cn("w-1.5 h-1.5 rounded-full", employee.status === 'On-Duty' ? "bg-emerald-500" : "bg-slate-400")}></span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase">{employee.status}</span>
          </div>
          <p className="text-sm text-on-surface-variant font-medium mb-4">
            {employee.role} <span className="mx-1.5 opacity-20">|</span> {employee.section}
          </p>

          <AnimatePresence>
            {showCoreDetails && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-outline-variant/10">
                  {[
                    { icon: Phone, label: 'Mobile', value: employee.mobile, sub: employee.whatsapp, subIcon: MessageSquare },
                    { icon: BadgeCheck, label: 'NIC / Identity', value: employee.nic, sub: employee.tax_residency },
                    { icon: Building2, label: 'Organization', value: employee.section, sub: employee.role },
                    { icon: Calendar, label: 'Joined', value: formatDate(employee.join_date) },
                    { icon: DollarSign, label: 'Salary Basis', value: `Rs. ${Number(employee.salary).toLocaleString()}`, sub: `${employee.salary_type} Basis` }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="p-1.5 bg-surface-container-high text-on-surface-variant rounded-lg"><item.icon size={14} /></div>
                      <div className="text-left">
                        <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-[11px] text-on-surface font-bold">{item.value}</p>
                        {item.sub && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {item.subIcon && <item.subIcon className="text-emerald-500" size={8} />}
                            <span className="text-[8px] font-medium text-on-surface-variant">{item.sub}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-6">
        {/* Payroll & Payment History */}
        <div className="space-y-6">
          {/* Payment Card (Smaller) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline font-bold text-lg text-on-surface">Payroll Summary</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPaymentHistory(!showPaymentHistory)} 
                  className={cn(
                    "p-1.5 rounded-xl transition-all",
                    showPaymentHistory ? "bg-primary text-on-primary shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                  )}
                  title="Payment History"
                >
                  <History size={16} />
                </button>
                <button onClick={() => setShowAdvanceModal(true)} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-xl font-bold text-[11px] hover:bg-primary/20 transition-all">
                  <Plus size={12} /> Advance
                </button>
                <button onClick={() => setShowLoanModal(true)} className="flex items-center gap-1.5 bg-secondary-container/20 text-secondary px-3 py-1.5 rounded-xl font-bold text-[11px] hover:bg-secondary-container/30 transition-all">
                  <DollarSign size={12} /> Loan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Gross Salary</p>
                <p className="text-lg font-bold text-on-surface">Rs. {actualSalary.toLocaleString()}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Advances</p>
                <p className="text-lg font-bold text-error">- Rs. {Number(payrollSummary?.total_advances || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Loans</p>
                <p className="text-lg font-bold text-error">- Rs. {Number(payrollSummary?.total_loan_installments || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-0.5 bg-primary/5 p-2.5 rounded-2xl border border-primary/10">
                <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Net Payable</p>
                <p className="text-xl font-bold text-primary">Rs. {netPayable.toLocaleString()}</p>
              </div>
            </div>

            {showPaymentHistory && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-6 pt-6 border-t border-outline-variant/10 space-y-6 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Recent Advances</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[9px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10">
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Amount</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advances.length > 0 ? advances.slice(0, 5).map(adv => (
                            <tr key={adv.id} className="border-b border-outline-variant/5">
                              <td className="py-2.5">{formatDate(adv.date)}</td>
                              <td className="py-2.5 font-bold">Rs. {Number(adv.amount).toLocaleString()}</td>
                              <td className="py-2.5"><span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">{adv.status}</span></td>
                            </tr>
                          )) : <tr><td colSpan={3} className="py-4 text-center text-on-surface-variant italic">No advances recorded</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Active Loans</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[9px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10">
                            <th className="pb-2">Date</th>
                            <th className="pb-2 text-right">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loans.length > 0 ? loans.slice(0, 5).map(loan => (
                            <tr key={loan.id} className="border-b border-outline-variant/5">
                              <td className="py-2.5">{formatDate(loan.date)}</td>
                              <td className="py-2.5 font-bold text-right text-error">Rs. {Number(loan.amount).toLocaleString()}</td>
                            </tr>
                          )) : <tr><td colSpan={2} className="py-4 text-center text-on-surface-variant italic">No loans recorded</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Attendance History - Full Width */}
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <h3 className="font-headline font-bold text-xl text-on-surface">Attendance History</h3>
            <div className="flex bg-surface-container-low p-1 rounded-xl">
              <button onClick={() => setHistoryTab('summary')} className={cn("px-3 py-1 text-[10px] font-bold rounded-lg transition-all", historyTab === 'summary' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant")}>Summary</button>
              <button onClick={() => setHistoryTab('month')} className={cn("px-3 py-1 text-[10px] font-bold rounded-lg transition-all", historyTab === 'month' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant")}>Month View</button>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-surface-container-low border-none rounded-lg text-[11px] font-bold py-1.5 px-3">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-surface-container-low border-none rounded-lg text-[11px] font-bold py-1.5 px-3">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {historyTab === 'summary' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-emerald-100/10 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-500/20"><p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-0.5">Present</p><p className="text-xl font-bold text-on-surface">{payrollSummary?.present_days || 0}</p></div>
              <div className="bg-amber-100/10 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-500/20"><p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-0.5">Half-Day</p><p className="text-xl font-bold text-on-surface">{payrollSummary?.half_days || 0}</p></div>
              <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border border-primary/20"><p className="text-[9px] font-bold text-primary uppercase mb-0.5">Allowances</p><p className="text-xl font-bold text-on-surface">Rs. {Number(payrollSummary?.total_allowance || 0).toLocaleString()}</p></div>
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10"><p className="text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">Total Days</p><p className="text-xl font-bold text-on-surface">{(payrollSummary?.present_days || 0) + (payrollSummary?.half_days || 0)}</p></div>
            </div>
            <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/10">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[9px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low"><th className="px-6 py-3">Date</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">In / Out</th><th className="px-6 py-3 text-right">Allowance</th></tr></thead>
                <tbody>
                  {filteredLogs.length > 0 ? filteredLogs.map(log => (
                    <tr key={log.id} className="border-t border-outline-variant/5">
                      <td className="px-6 py-3 font-medium">{formatDate(log.date)}</td>
                      <td className="px-6 py-3"><span className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded uppercase", log.status === 'Present' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : log.status === 'Half-Day' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400")}>{log.status}</span></td>
                      <td className="px-6 py-3 text-on-surface-variant">{formatTime(log.check_in)} - {formatTime(log.check_out)}</td>
                      <td className="px-6 py-3 text-right font-bold text-primary">Rs. {Number(log.allowance || 0).toLocaleString()}</td>
                    </tr>
                  )) : <tr><td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant italic">No records for attended dates</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/10 shadow-sm max-w-md mx-auto">
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={`${day}-${i}`} className="text-center text-[9px] font-bold text-on-surface-variant uppercase tracking-widest pb-2">{day}</div>
              ))}
              {Array.from({ length: new Date(selectedYear, selectedMonth - 1, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-surface-container-low/20 rounded-lg"></div>
              ))}
              {monthDays.map(({ day, dateStr, log }) => (
                <div 
                  key={dateStr} 
                  className={cn(
                    "relative aspect-square rounded-lg border transition-all flex flex-col items-center justify-center",
                    log ? (
                      log.status === 'Present' ? "bg-rose-100 border-rose-200 text-rose-950 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400" :
                      log.status === 'Half-Day' ? "bg-emerald-100 border-emerald-200 text-emerald-950 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400" :
                      "bg-slate-200 border-slate-300 text-slate-950 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                    ) : "bg-surface-container-low border-outline-variant/5 text-on-surface-variant/40"
                  )}
                >
                  <span className="text-[10px] font-bold">{day}</span>
                  {log && log.allowance > 0 && (
                    <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-primary shadow-sm"></div>
                  )}
                  {!log && (
                    <button 
                      onClick={() => { setNewLog(prev => ({ ...prev, date: dateStr })); setShowAddModal(true); }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-primary/10 rounded-lg transition-opacity"
                    >
                      <Plus size={10} className="text-primary" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-200 border border-rose-300 dark:bg-rose-900/50 dark:border-rose-800"></span> Present</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-200 border border-emerald-300 dark:bg-emerald-900/50 dark:border-emerald-800"></span> Half-Day</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-slate-300 border border-slate-400 dark:bg-slate-700 dark:border-slate-600"></span> Absent</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Allowance</div>
            </div>
          </div>
        )}
      </div>

      {/* Documents Section */}
      {details.length > 0 && (
        <div className="space-y-5">
          <h3 className="font-headline font-bold text-xl text-on-surface">Additional Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {details.map((detail) => (
              <div key={detail.id} className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/10 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-primary text-sm">{detail.title}</h5>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">{formatDate(detail.created_at)}</span>
                </div>
                {detail.content && <p className="text-xs text-on-surface-variant leading-relaxed">{detail.content}</p>}
                {detail.image_data && (
                  <div className="rounded-2xl overflow-hidden border border-outline-variant/10 bg-surface-container-low">
                    <img src={detail.image_data} alt={detail.title} className="w-full h-auto object-contain max-h-[150px]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-2xl border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-5">Add Attendance</h3>
            <div className="space-y-3">
              <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Date</label><input type="date" value={newLog.date} onChange={(e) => setNewLog(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs font-medium text-on-surface" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Check-in</label><input type="time" value={newLog.check_in} onChange={(e) => setNewLog(prev => ({ ...prev, check_in: e.target.value }))} className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs font-medium text-on-surface" /></div>
                <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Check-out</label><input type="time" value={newLog.check_out} onChange={(e) => setNewLog(prev => ({ ...prev, check_out: e.target.value }))} className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs font-medium text-on-surface" /></div>
              </div>
              <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Status</label><select value={newLog.status} onChange={(e) => setNewLog(prev => ({ ...prev, status: e.target.value }))} className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs font-medium text-on-surface"><option value="Present">Present</option><option value="Half-Day">Half-Day</option><option value="Absent">Absent</option></select></div>
              <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Allowance (Rs.)</label><input type="number" value={newLog.allowance} onChange={(e) => setNewLog(prev => ({ ...prev, allowance: Number(e.target.value) }))} className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs font-medium text-on-surface" /></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Cancel</button><button onClick={handleAddAttendance} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-lg shadow-primary/20">Save</button></div>
          </motion.div>
        </div>
      )}

      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-2xl border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-5">Request Advance</h3>
            <div className="space-y-3">
              <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Amount (Rs.)</label><input type="number" value={newAdvance.amount} onChange={(e) => setNewAdvance({ amount: Number(e.target.value) })} className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs font-medium text-on-surface" /></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowAdvanceModal(false)} className="flex-1 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Cancel</button><button onClick={handleAddAdvance} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-lg shadow-primary/20">Submit</button></div>
          </motion.div>
        </div>
      )}

      {showLoanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-2xl border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-5">Apply for Loan</h3>
            <div className="space-y-3">
              <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Total Amount (Rs.)</label><input type="number" value={newLoan.amount} onChange={(e) => setNewLoan(prev => ({ ...prev, amount: Number(e.target.value) }))} className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs font-medium text-on-surface" /></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowLoanModal(false)} className="flex-1 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Cancel</button><button onClick={handleAddLoan} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-lg shadow-primary/20">Apply</button></div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
