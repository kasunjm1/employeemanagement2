import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, DollarSign, CreditCard, History, User, ChevronRight, X, ArrowUpRight, ArrowDownLeft, Wallet, Calendar, LayoutGrid, List, Briefcase, Download, FileText, Plus, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Role, Section, PayrollAdvance, PayrollLoan, Project } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';
import { exportToExcel, exportToPDF } from '@/src/lib/reportUtils';

const PayrollManagement = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<number>(0);
  const [sectionFilter, setSectionFilter] = useState<number>(0);
  const [projectFilter, setProjectFilter] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'employees' | 'advances' | 'loans'>('employees');
  const [advances, setAdvances] = useState<PayrollAdvance[]>([]);
  const [loans, setLoans] = useState<PayrollLoan[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState<{ advances: PayrollAdvance[], loans: PayrollLoan[] }>({ advances: [], loans: [] });
  const [selectedAdvanceBreakdown, setSelectedAdvanceBreakdown] = useState<any[] | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<PayrollAdvance | null>(null);
  const [editingLoan, setEditingLoan] = useState<PayrollLoan | null>(null);

  // Advance Breakdown State
  const [breakdowns, setBreakdowns] = useState<{ project_id: number, project_name?: string, payable?: number, amount: string }[]>([]);

  const fetchPayrollSummary = () => {
    fetchWithAuth(`/api/payroll/summary?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data);
      })
      .catch(err => console.error('Error fetching payroll summary:', err));
  };

  const fetchAdvances = () => {
    fetchWithAuth(`/api/payroll/advances?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAdvances(data);
      });
  };

  const fetchLoans = () => {
    fetchWithAuth(`/api/payroll/loans?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLoans(data);
      });
  };

  const fetchRoles = () => {
    fetchWithAuth('/api/roles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRoles(data);
      });
  };

  const fetchSections = () => {
    fetchWithAuth('/api/sections')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSections(data);
      });
  };

  const fetchProjects = () => {
    fetchWithAuth('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
      });
  };

  useEffect(() => {
    fetchPayrollSummary();
    fetchAdvances();
    fetchLoans();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchRoles();
    fetchSections();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (showAdvanceModal && selectedEmployee) {
      fetchWithAuth(`/api/payroll/suggested-breakdown/${selectedEmployee.id}?month=${selectedMonth}&year=${selectedYear}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setBreakdowns(data);
            const total = data.reduce((sum, b) => sum + parseFloat(b.amount), 0);
            setIsAdjusting(true);
            setAdvanceAmount(total.toString());
            setTimeout(() => setIsAdjusting(false), 0);
          } else {
            setBreakdowns([]);
            setAdvanceAmount('');
          }
        })
        .catch(err => console.error('Error fetching suggested breakdown:', err));
    }
  }, [showAdvanceModal, selectedEmployee, selectedMonth, selectedYear]);

  useEffect(() => {
    if (isAdjusting || breakdowns.length === 0 || !advanceAmount) return;
    
    const totalAmount = parseFloat(advanceAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) return;

    let remaining = totalAmount;
    const newBreakdowns = breakdowns.map(b => {
      const payable = b.payable || 0;
      const take = Math.min(remaining, payable);
      remaining -= take;
      return { ...b, amount: take.toFixed(2) };
    });

    // If there's still remaining amount, add it to the last project
    if (remaining > 0 && newBreakdowns.length > 0) {
      const lastIdx = newBreakdowns.length - 1;
      newBreakdowns[lastIdx].amount = (parseFloat(newBreakdowns[lastIdx].amount) + remaining).toFixed(2);
    }

    setBreakdowns(newBreakdowns);
  }, [advanceAmount]);

  const fetchEmployeeHistory = async (empId: number) => {
    if (!empId) return;
    try {
      const [advRes, loanRes] = await Promise.all([
        fetchWithAuth(`/api/payroll/advances?employee_id=${empId}`),
        fetchWithAuth(`/api/payroll/loans?employee_id=${empId}`)
      ]);
      const advData = await advRes.json();
      const loanData = await loanRes.json();
      setEmployeeHistory({ advances: advData, loans: loanData });
      setSelectedAdvanceBreakdown(null);
      setShowHistoryModal(true);
    } catch (err) {
      console.error('Error fetching employee history:', err);
    }
  };

  const fetchBreakdown = async (advanceId: number) => {
    try {
      const res = await fetchWithAuth(`/api/payroll/advances/${advanceId}/breakdown`);
      const data = await res.json();
      setSelectedAdvanceBreakdown(data);
    } catch (err) {
      console.error('Error fetching breakdown:', err);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !advanceAmount) return;

    const amount = parseFloat(advanceAmount);
    const netPayable = calculateActualSalary(selectedEmployee) - Number(selectedEmployee.total_advances) - Number(selectedEmployee.total_loan_installments);

    if (amount > netPayable) {
      alert(`Advance amount exceeds net payable limit of Rs. ${netPayable.toLocaleString()}`);
      return;
    }

    const totalBreakdown = breakdowns.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0);
    if (breakdowns.length > 0 && Math.abs(totalBreakdown - amount) > 0.01) {
      alert(`Total breakdown (Rs. ${totalBreakdown}) must match the total advance amount (Rs. ${amount})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingAdvance ? `/api/payroll/advances/${editingAdvance.id}` : '/api/payroll/advances-with-breakdown';
      const method = editingAdvance ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          amount,
          date: editingAdvance ? editingAdvance.date : new Date().toISOString().split('T')[0],
          breakdown: breakdowns.map(b => ({
            project_id: b.project_id,
            amount: parseFloat(b.amount)
          }))
        })
      });

      if (res.ok) {
        setShowAdvanceModal(false);
        setEditingAdvance(null);
        setAdvanceAmount('');
        setBreakdowns([]);
        fetchPayrollSummary();
        fetchAdvances();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdvance = async (id: number) => {
    if (!confirm('Are you sure you want to delete this advance record?')) return;
    try {
      const res = await fetchWithAuth(`/api/payroll/advances/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdvances();
        fetchPayrollSummary();
      }
    } catch (err) {
      console.error('Error deleting advance:', err);
    }
  };

  const handleEditAdvance = async (adv: PayrollAdvance) => {
    const emp = employees.find(e => e.id === adv.employee_id);
    if (!emp) return;
    
    setSelectedEmployee(emp);
    setEditingAdvance(adv);
    setAdvanceAmount(adv.amount.toString());
    
    // Fetch breakdown
    try {
      const res = await fetchWithAuth(`/api/payroll/advances/${adv.id}/breakdown`);
      const data = await res.json();
      setBreakdowns(data.map((b: any) => ({
        project_id: b.project_id,
        project_name: b.project_name,
        amount: b.amount.toString()
      })));
    } catch (err) {
      console.error('Error fetching breakdown for edit:', err);
    }
    
    setShowAdvanceModal(true);
  };

  const addBreakdown = () => {
    setBreakdowns([...breakdowns, { project_id: 0, amount: '' }]);
  };

  const removeBreakdown = (index: number) => {
    setBreakdowns(breakdowns.filter((_, i) => i !== index));
  };

  const updateBreakdown = (index: number, field: 'project_id' | 'amount', value: any) => {
    const newBreakdowns = [...breakdowns];
    newBreakdowns[index] = { ...newBreakdowns[index], [field]: value };
    
    if (field === 'amount') {
      const newTotal = newBreakdowns.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0);
      setIsAdjusting(true);
      setAdvanceAmount(newTotal.toString());
      setTimeout(() => setIsAdjusting(false), 0);
    } else if (field === 'project_id') {
      const proj = projects.find(p => p.id === value);
      if (proj) {
        newBreakdowns[index].project_name = proj.name;
      }
    }
    
    setBreakdowns(newBreakdowns);
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !loanAmount) return;

    const amount = parseFloat(loanAmount);
    
    setIsSubmitting(true);
    try {
      const url = editingLoan ? `/api/payroll/loans/${editingLoan.id}` : '/api/payroll/loans';
      const method = editingLoan ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          amount
        })
      });

      if (res.ok) {
        setShowLoanModal(false);
        setEditingLoan(null);
        setLoanAmount('');
        fetchPayrollSummary();
        fetchLoans();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async (id: number) => {
    if (!confirm('Are you sure you want to delete this loan record?')) return;
    try {
      const res = await fetchWithAuth(`/api/payroll/loans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLoans();
        fetchPayrollSummary();
      }
    } catch (err) {
      console.error('Error deleting loan:', err);
    }
  };

  const handleEditLoan = (loan: PayrollLoan) => {
    const emp = employees.find(e => e.id === loan.employee_id);
    if (!emp) return;
    
    setSelectedEmployee(emp);
    setEditingLoan(loan);
    setLoanAmount(loan.amount.toString());
    setShowLoanModal(true);
  };

  const calculateActualSalary = (emp: any) => {
    if (emp.total_earned !== undefined) {
      return Number(emp.total_earned) || 0;
    }
    const baseSalary = Number(emp.salary) || 0;
    const presentDays = Number(emp.present_days) || 0;
    const halfDays = Number(emp.half_days) || 0;
    const totalUnits = Number(emp.total_units) || 0;
    const allowance = Number(emp.total_allowance) || 0;

    if (emp.salary_type === 'Daily') {
      return (presentDays + halfDays * 0.5) * baseSalary + allowance;
    }
    if (emp.salary_type === 'Per-unit') {
      return totalUnits * baseSalary + allowance;
    }
    return baseSalary + allowance;
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
      (e.employee_number && e.employee_number.toLowerCase().includes(search.toLowerCase()));
    
    const matchesRole = roleFilter === 0 || e.role_id === roleFilter;
    const matchesProject = projectFilter === 0 || e.project_id === projectFilter;
    
    return matchesSearch && matchesRole && matchesProject;
  });

  const handleExportExcel = async () => {
    const monthName = new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    const columns = [
      { header: 'Profile', dataKey: 'avatar_url', isImage: true },
      { header: 'Employee ID', dataKey: 'employee_number' },
      { header: 'Name', dataKey: 'name' },
      { header: 'Salary Type', dataKey: 'salary_type' },
      { header: 'Present Days', dataKey: 'present_days' },
      { header: 'Half Days', dataKey: 'half_days' },
      { header: 'Allowance', dataKey: 'total_allowance' },
      { header: 'Gross Salary', dataKey: 'gross' },
      { header: 'Advances', dataKey: 'total_advances' },
      { header: 'Loans', dataKey: 'total_loan_installments' },
      { header: 'Net Payable', dataKey: 'net' }
    ];
    const data = filteredEmployees.map(emp => ({
      ...emp,
      gross: calculateActualSalary(emp),
      net: calculateActualSalary(emp) - Number(emp.total_advances) - Number(emp.total_loan_installments)
    }));
    await exportToExcel(data, columns, `Payroll_Report_${monthName}_${selectedYear}`);
  };

  const handleExportPDF = async () => {
    const monthName = new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    const columns = [
      { header: '', dataKey: 'avatar_url', isImage: true },
      { header: 'ID', dataKey: 'employee_number' },
      { header: 'Name', dataKey: 'name' },
      { header: 'Type', dataKey: 'salary_type' },
      { header: 'Days', dataKey: 'attendance' },
      { header: 'Gross', dataKey: 'gross' },
      { header: 'Deductions', dataKey: 'deductions' },
      { header: 'Net', dataKey: 'net' }
    ];
    const data = filteredEmployees.map(emp => ({
      ...emp,
      attendance: `${emp.present_days}P, ${emp.half_days}H`,
      gross: calculateActualSalary(emp).toLocaleString(),
      deductions: (Number(emp.total_advances) + Number(emp.total_loan_installments)).toLocaleString(),
      net: (calculateActualSalary(emp) - Number(emp.total_advances) - Number(emp.total_loan_installments)).toLocaleString()
    }));
    await exportToPDF(data, columns, `Payroll Report - ${monthName} ${selectedYear}`, `Payroll_Report_${monthName}_${selectedYear}`);
  };

  const totalSalaries = filteredEmployees.reduce((acc, emp) => acc + calculateActualSalary(emp), 0);
  const totalAdvances = filteredEmployees.reduce((acc, emp) => acc + Number(emp.total_advances), 0);
  const totalLoans = filteredEmployees.reduce((acc, emp) => acc + Number(emp.total_loan_installments), 0);
  const totalPayableLimit = totalSalaries - totalAdvances - totalLoans;

  return (
    <div className="space-y-8">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <span className="font-body text-[11px] font-semibold tracking-widest uppercase text-on-surface-variant">Finance</span>
          <h2 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">Payroll</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-surface-container-low rounded-xl p-1 border border-outline-variant/10">
            <button 
              onClick={handleExportExcel}
              className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-all flex items-center gap-2 text-xs font-bold"
              title="Export Excel"
            >
              <Download size={16} />
              Excel
            </button>
            <div className="w-px h-4 bg-outline-variant/20 mx-1" />
            <button 
              onClick={handleExportPDF}
              className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-all flex items-center gap-2 text-xs font-bold"
              title="Export PDF"
            >
              <FileText size={16} />
              PDF
            </button>
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary transition-all"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
        </div>
      </section>

      <div className="flex gap-4 border-b border-outline-variant/10">
        <button 
          onClick={() => setActiveTab('employees')}
          className={cn(
            "px-6 py-3 font-bold text-sm transition-all relative",
            activeTab === 'employees' ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          Employee List
          {activeTab === 'employees' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('advances')}
          className={cn(
            "px-6 py-3 font-bold text-sm transition-all relative",
            activeTab === 'advances' ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          Advances
          {activeTab === 'advances' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('loans')}
          className={cn(
            "px-6 py-3 font-bold text-sm transition-all relative",
            activeTab === 'loans' ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          Loans
          {activeTab === 'loans' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'employees' && (
        <>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/10 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={20} />
              <input 
                type="text"
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(parseInt(e.target.value))}
                className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="0">All Roles</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select 
                value={projectFilter}
                onChange={(e) => setProjectFilter(parseInt(e.target.value))}
                className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="0">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button 
                onClick={() => {
                  setSearch('');
                  setRoleFilter(0);
                  setProjectFilter(0);
                }}
                className="flex items-center gap-2 px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <X size={18} />
                Clear
              </button>
            </div>
            <div className="flex bg-surface-container-low p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <Link to={`/directory/${emp.id}`} className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/10 hover:opacity-80 transition-opacity">
                      <img src={emp.avatar_url || `https://picsum.photos/seed/${emp.id}/200/200`} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">{emp.employee_number}</span>
                      <h3 className="font-headline font-bold text-lg text-on-surface truncate">{emp.name}</h3>
                      <p className="text-sm text-on-surface-variant font-medium">{emp.salary_type} Salary</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">
                        {emp.salary_type === 'Daily' ? `Attendance (${Number(emp.present_days) + Number(emp.half_days) * 0.5} Days)` : 
                         emp.salary_type === 'Per-unit' ? `Units (${Number(emp.total_units)})` : 'Base Salary'}
                      </span>
                      <span className="font-bold text-on-surface">
                        Rs. {emp.salary_type === 'Daily' 
                          ? ((Number(emp.present_days) + Number(emp.half_days) * 0.5) * Number(emp.salary)).toLocaleString()
                          : emp.salary_type === 'per unit'
                          ? (Number(emp.total_units) * Number(emp.salary)).toLocaleString()
                          : Number(emp.salary).toLocaleString()}
                      </span>
                    </div>
                    {Number(emp.total_allowance) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Allowances</span>
                        <span className="font-bold text-green-600">+ Rs. {Number(emp.total_allowance).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-outline-variant/5">
                      <span className="text-on-surface-variant font-bold">Total Salary</span>
                      <span className="font-bold text-on-surface">Rs. {calculateActualSalary(emp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Advances</span>
                      <span className="font-bold text-error">- Rs. {Number(emp.total_advances).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Loan Installments</span>
                      <span className="font-bold text-error">- Rs. {Number(emp.total_loan_installments).toLocaleString()}</span>
                    </div>
                    <div className="pt-3 border-t border-outline-variant/10 flex justify-between">
                      <span className="font-bold text-on-surface">Payable Limit</span>
                      <span className="font-bold text-primary">Rs. {(calculateActualSalary(emp) - Number(emp.total_advances) - Number(emp.total_loan_installments)).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setShowAdvanceModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/5 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-on-primary transition-all"
                    >
                      <ArrowUpRight size={14} />
                      Advance
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setShowLoanModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-secondary/5 text-secondary rounded-xl text-xs font-bold hover:bg-secondary hover:text-on-secondary transition-all"
                    >
                      <DollarSign size={14} />
                      Loan
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedEmployee(emp);
                      fetchEmployeeHistory(emp.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-surface-container text-on-surface-variant rounded-xl text-xs font-bold hover:bg-surface-container-high transition-all"
                  >
                    <History size={14} />
                    View History
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Salary</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Deductions</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Payable Limit</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <tr className="bg-primary/10 font-bold">
                    <td className="px-6 py-4 text-xs uppercase tracking-wider text-primary">Totals</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-primary">Rs. {totalSalaries.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-error">Rs. {(totalAdvances + totalLoans).toLocaleString()}</div>
                      <div className="text-[10px] text-on-surface-variant uppercase">Adv: {totalAdvances.toLocaleString()} | Loan: {totalLoans.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-primary">Rs. {totalPayableLimit.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link to={`/directory/${emp.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-primary/10 hover:opacity-80 transition-opacity">
                            <img src={emp.avatar_url || `https://picsum.photos/seed/${emp.id}/200/200`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </Link>
                          <div>
                            <div className="font-bold text-on-surface">{emp.name}</div>
                            <div className="text-[10px] font-bold text-primary uppercase tracking-wider">{emp.employee_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-on-surface">Rs. {calculateActualSalary(emp).toLocaleString()}</div>
                        <div className="text-[10px] text-on-surface-variant font-medium uppercase">
                          {emp.salary_type === 'Daily' 
                            ? `${Number(emp.present_days) + Number(emp.half_days) * 0.5} Days @ Rs. ${emp.salary.toLocaleString()}`
                            : emp.salary_type === 'Per-unit'
                            ? `${Number(emp.total_units)} Units @ Rs. ${emp.salary.toLocaleString()}`
                            : `${emp.salary_type} Salary`}
                          {Number(emp.total_allowance) > 0 && ` + Rs. ${Number(emp.total_allowance).toLocaleString()} Allow.`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-error font-bold">- Rs. {(Number(emp.total_advances) + Number(emp.total_loan_installments)).toLocaleString()}</div>
                        <div className="text-[10px] text-on-surface-variant">Adv: {Number(emp.total_advances).toLocaleString()} | Loan: {Number(emp.total_loan_installments).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-primary">Rs. {(calculateActualSalary(emp) - Number(emp.total_advances) - Number(emp.total_loan_installments)).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedEmployee(emp);
                              fetchEmployeeHistory(emp.id);
                            }}
                            className="p-2 bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-all"
                            title="History"
                          >
                            <History size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setShowAdvanceModal(true);
                            }}
                            className="p-2 bg-primary/5 text-primary rounded-lg hover:bg-primary hover:text-on-primary transition-all"
                            title="Advance"
                          >
                            <ArrowUpRight size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setShowLoanModal(true);
                            }}
                            className="p-2 bg-secondary/5 text-secondary rounded-lg hover:bg-secondary hover:text-on-secondary transition-all"
                            title="Loan"
                          >
                            <DollarSign size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'advances' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Employee</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {advances.map(adv => (
                <tr key={adv.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{adv.name}</div>
                    <div className="text-xs text-on-surface-variant">{adv.employee_number}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface">{new Date(adv.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-error">Rs. {adv.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase tracking-wider">{adv.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditAdvance(adv)}
                        className="p-2 bg-primary/5 text-primary rounded-lg hover:bg-primary hover:text-on-primary transition-all"
                        title="Edit Advance"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {advances.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant italic">No advance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Employee</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loans.map(loan => (
                <tr key={loan.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{loan.name}</div>
                    <div className="text-xs text-on-surface-variant">{loan.employee_number}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-error">Rs. {loan.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase tracking-wider">{loan.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditLoan(loan)}
                        className="p-2 bg-primary/5 text-primary rounded-lg hover:bg-primary hover:text-on-primary transition-all"
                        title="Edit Loan"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant italic">No loan records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Advance Modal */}
      <AnimatePresence>
        {showAdvanceModal && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/10 p-6"
            >
              <h3 className="font-headline font-bold text-xl text-on-surface mb-5">
                {editingAdvance ? 'Edit Salary Advance' : 'Salary Advance'}
              </h3>
              
              <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img src={selectedEmployee.avatar_url || `https://picsum.photos/seed/${selectedEmployee.id}/200/200`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-on-surface">{selectedEmployee.name}</div>
                    <div className="text-[10px] text-on-surface-variant font-bold uppercase">Limit: Rs. {(selectedEmployee.salary - selectedEmployee.total_advances - selectedEmployee.total_loan_installments).toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Total Amount (Rs.)</label>
                  <input 
                    type="number" 
                    required
                    autoFocus
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Project Breakdown (Optional)</label>
                    <button 
                      type="button"
                      onClick={addBreakdown}
                      className="text-primary hover:bg-primary/5 p-1 rounded-lg transition-all"
                      title="Add Project Allocation"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {breakdowns.map((b, index) => (
                      <div key={index} className="flex gap-2 items-center bg-surface-container-low p-2 rounded-xl border border-outline-variant/5">
                        <div className="flex-1 min-w-0">
                          {b.project_id === 0 ? (
                            <select 
                              required
                              value={b.project_id}
                              onChange={(e) => updateBreakdown(index, 'project_id', parseInt(e.target.value))}
                              className="w-full bg-surface-container-lowest border-none rounded-lg py-1 px-2 text-[10px] font-bold text-on-surface focus:ring-2 focus:ring-primary transition-all"
                            >
                              <option value="0">Select Project</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          ) : (
                            <>
                              <div className="text-[10px] font-bold text-on-surface truncate">{b.project_name || 'Unknown Project'}</div>
                              <div className="text-[9px] text-on-surface-variant font-medium">Payable: Rs. {Number(b.payable || 0).toLocaleString()}</div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-on-surface-variant">Rs.</span>
                          <input 
                            type="number"
                            required
                            placeholder="Amount"
                            value={b.amount}
                            onChange={(e) => updateBreakdown(index, 'amount', e.target.value)}
                            className="w-24 bg-surface-container-lowest border-none rounded-lg py-1.5 px-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeBreakdown(index)}
                          className="text-on-surface-variant hover:text-error p-1 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {breakdowns.length > 0 && (
                      <div className="flex justify-between px-2 pt-1 text-[10px] font-bold">
                        <span className="text-on-surface-variant uppercase">Total Allocated:</span>
                        <span className={cn(
                          Math.abs(breakdowns.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0) - parseFloat(advanceAmount || '0')) < 0.01 
                            ? "text-green-600" 
                            : "text-error"
                        )}>
                          Rs. {breakdowns.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAdvanceModal(false);
                      setEditingAdvance(null);
                      setAdvanceAmount('');
                      setBreakdowns([]);
                    }}
                    className="flex-1 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !advanceAmount}
                    className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loan Modal */}
      <AnimatePresence>
        {showLoanModal && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/10 p-6"
            >
              <h3 className="font-headline font-bold text-xl text-on-surface mb-5">
                {editingLoan ? 'Edit Loan' : 'Apply for Loan'}
              </h3>
              
              <form onSubmit={handleLoanSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img src={selectedEmployee.avatar_url || `https://picsum.photos/seed/${selectedEmployee.id}/200/200`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-on-surface">{selectedEmployee.name}</div>
                    <div className="text-[10px] text-on-surface-variant font-bold uppercase">Employee Loan</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Total Amount (Rs.)</label>
                  <input 
                    type="number" 
                    required
                    autoFocus
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm font-bold text-on-surface focus:ring-2 focus:ring-secondary transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowLoanModal(false);
                      setEditingLoan(null);
                      setLoanAmount('');
                    }}
                    className="flex-1 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !loanAmount}
                    className="flex-1 bg-secondary text-on-secondary py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : (editingLoan ? 'Update' : 'Apply')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showHistoryModal && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-surface-container-lowest rounded-[2rem] shadow-2xl overflow-hidden border border-outline-variant/10"
            >
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-xl text-on-surface">Payment History</h3>
                  <p className="text-xs text-on-surface-variant font-medium">{selectedEmployee.name} ({selectedEmployee.employee_number})</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} className="text-on-surface-variant" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                <section>
                  <h4 className="font-bold text-[10px] uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                    <ArrowUpRight size={14} />
                    Advances History
                  </h4>
                  <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/5">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-surface-container border-b border-outline-variant/10">
                          <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase text-[9px]">Date</th>
                          <th className="px-4 py-2.5 font-bold text-right text-on-surface-variant uppercase text-[9px]">Amount</th>
                          <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase text-[9px]">Status</th>
                          <th className="px-4 py-2.5 font-bold text-right text-on-surface-variant uppercase text-[9px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {employeeHistory.advances.map(adv => (
                          <React.Fragment key={adv.id}>
                            <tr className="group hover:bg-surface-container-high/50 transition-colors">
                              <td className="px-4 py-2.5 text-on-surface">{new Date(adv.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-error">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => fetchBreakdown(adv.id)}
                                    className="p-1 text-primary hover:bg-primary/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                    title="View Breakdown"
                                  >
                                    <List size={12} />
                                  </button>
                                  Rs. {adv.amount.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[8px] font-bold rounded uppercase tracking-wider">{adv.status}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex justify-end gap-1">
                                  <button 
                                    onClick={() => handleEditAdvance(adv)}
                                    className="p-1 text-primary hover:bg-primary/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                    title="Edit"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {selectedAdvanceBreakdown && selectedAdvanceBreakdown.length > 0 && selectedAdvanceBreakdown[0].advance_id === adv.id && (
                              <tr className="bg-surface-container-high/30 animate-in fade-in slide-in-from-top-1 duration-200">
                                <td colSpan={3} className="px-4 py-3">
                                  <div className="space-y-2 border-l-2 border-primary/20 ml-2 pl-4">
                                    <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Project Allocation</p>
                                    {selectedAdvanceBreakdown.map((b, idx) => (
                                      <div key={idx} className="flex justify-between text-[10px] font-medium">
                                        <span className="text-on-surface-variant">{b.project_name}</span>
                                        <span className="font-bold text-on-surface">Rs. {Number(b.amount).toLocaleString()}</span>
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => setSelectedAdvanceBreakdown(null)}
                                      className="text-[9px] font-bold text-primary hover:underline pt-1"
                                    >
                                      Hide Breakdown
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                        {employeeHistory.advances.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-on-surface-variant italic">No advance history.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h4 className="font-bold text-[10px] uppercase tracking-widest text-secondary mb-3 flex items-center gap-2">
                    <DollarSign size={14} />
                    Loans History
                  </h4>
                  <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/5">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-surface-container border-b border-outline-variant/10">
                          <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase text-[9px]">Date</th>
                          <th className="px-4 py-2.5 font-bold text-right text-on-surface-variant uppercase text-[9px]">Amount</th>
                          <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase text-[9px]">Status</th>
                          <th className="px-4 py-2.5 font-bold text-right text-on-surface-variant uppercase text-[9px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {employeeHistory.loans.map(loan => (
                          <tr key={loan.id} className="group hover:bg-surface-container-high/50 transition-colors">
                            <td className="px-4 py-2.5 text-on-surface">{new Date(loan.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-error">Rs. {loan.amount.toLocaleString()}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[8px] font-bold rounded uppercase tracking-wider">{loan.status}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => handleEditLoan(loan)}
                                  className="p-1 text-primary hover:bg-primary/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                  title="Edit"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {employeeHistory.loans.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-on-surface-variant italic">No loan history.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <div className="p-6 bg-surface-container-low border-t border-outline-variant/10">
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-3 bg-on-surface text-surface rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PayrollManagement;
