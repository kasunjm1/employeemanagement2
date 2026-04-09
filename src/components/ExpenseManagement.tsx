import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Filter, 
  Download,
  ChevronRight,
  XCircle,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Calendar
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { Project } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ProjectExpense {
  project_id: number;
  project_name: string;
  paid_expenses: number;
  pending_expenses: number;
  total_expenses: number;
}

interface EmployeeBreakdown {
  employee_id: number;
  employee_name: string;
  employee_number: string;
  working_days: number;
  earned_salary: number;
  paid_advances: number;
  pending: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ExpenseManagement: React.FC = () => {
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');
  const [selectedProject, setSelectedProject] = useState<ProjectExpense | null>(null);
  const [breakdownData, setBreakdownData] = useState<EmployeeBreakdown[]>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/reports/project-expenses?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExpenses(data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBreakdown = async (project: ProjectExpense) => {
    setSelectedProject(project);
    setLoadingBreakdown(true);
    try {
      const res = await fetchWithAuth(`/api/reports/project-expenses/${project.project_id}/breakdown?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setBreakdownData(data);
      }
    } catch (err) {
      console.error('Error fetching breakdown:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  const filteredExpenses = expenses.filter(e => e.total_expenses > 0);

  const totalPaid = filteredExpenses.reduce((sum, e) => sum + e.paid_expenses, 0);
  const totalPending = filteredExpenses.reduce((sum, e) => sum + e.pending_expenses, 0);
  const totalOverall = totalPaid + totalPending;

  const chartData = filteredExpenses.map(e => ({
    name: e.project_name,
    Paid: e.paid_expenses,
    Pending: e.pending_expenses
  }));

  const pieData = [
    { name: 'Paid', value: totalPaid },
    { name: 'Pending', value: totalPending }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Project Expenses</h1>
          <p className="text-on-surface-variant">Salary-based project expense tracking</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-lg border border-outline-variant">
            <Calendar className="w-4 h-4 text-on-surface-variant" />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium"
            >
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant">
            <button 
              onClick={() => setViewMode('charts')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'charts' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <BarChartIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <ChevronRight className="w-4 h-4 rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Total Expenses</p>
              <h3 className="text-2xl font-bold">Rs. {totalOverall.toLocaleString()}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Paid Expenses</p>
              <h3 className="text-2xl font-bold text-emerald-500">Rs. {totalPaid.toLocaleString()}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Pending Expenses</p>
              <h3 className="text-2xl font-bold text-amber-500">Rs. {totalPending.toLocaleString()}</h3>
            </div>
          </div>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant text-center">
          <p className="text-on-surface-variant">No expense data found for the selected period.</p>
        </div>
      ) : viewMode === 'charts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm"
          >
            <h3 className="text-lg font-bold mb-6">Project-wise Breakdown</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface-container-lowest)',
                      borderColor: 'var(--color-outline-variant)',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="Paid" 
                    stackId="a" 
                    fill="#10b981" 
                    onClick={(data) => {
                      const project = expenses.find(e => e.project_name === data.name);
                      if (project) fetchBreakdown(project);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="Pending" 
                    stackId="a" 
                    fill="#f59e0b" 
                    onClick={(data) => {
                      const project = expenses.find(e => e.project_name === data.name);
                      if (project) fetchBreakdown(project);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm"
          >
            <h3 className="text-lg font-bold mb-6">Payment Status</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface-container-lowest)',
                      borderColor: 'var(--color-outline-variant)',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Project Name</th>
                  <th className="px-6 py-4 font-semibold text-right">Total Expense</th>
                  <th className="px-6 py-4 font-semibold text-right">Paid (Advances)</th>
                  <th className="px-6 py-4 font-semibold text-right">Pending (Earned)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredExpenses.map((e) => (
                  <tr key={e.project_id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <button 
                        onClick={() => fetchBreakdown(e)}
                        className="text-primary hover:underline text-left font-bold"
                      >
                        {e.project_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      Rs. {e.total_expenses.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-semibold">
                      Rs. {e.paid_expenses.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-amber-600 font-semibold">
                      Rs. {e.pending_expenses.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container/50 font-bold">
                  <td className="px-6 py-4">Total</td>
                  <td className="px-6 py-4 text-right">Rs. {totalOverall.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-emerald-600">Rs. {totalPaid.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-amber-600">Rs. {totalPending.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      )}

      {/* Breakdown Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <div>
                <h2 className="text-xl font-bold">{selectedProject.project_name}</h2>
                <p className="text-sm text-on-surface-variant">Expense Breakdown for {months[selectedMonth-1]} {selectedYear}</p>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingBreakdown ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : breakdownData.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  No employee data found for this project in the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-on-surface-variant text-[10px] uppercase tracking-wider border-b border-outline-variant">
                        <th className="pb-4 font-bold">Employee</th>
                        <th className="pb-4 font-bold text-center">Days</th>
                        <th className="pb-4 font-bold text-right">Earned</th>
                        <th className="pb-4 font-bold text-right">Paid</th>
                        <th className="pb-4 font-bold text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {breakdownData.map((b) => (
                        <tr key={b.employee_id} className="text-sm">
                          <td className="py-4">
                            <div className="font-bold">{b.employee_name}</div>
                            <div className="text-[10px] text-on-surface-variant">{b.employee_number}</div>
                          </td>
                          <td className="py-4 text-center font-medium">{b.working_days}</td>
                          <td className="py-4 text-right font-medium">Rs. {Math.round(b.earned_salary).toLocaleString()}</td>
                          <td className="py-4 text-right font-medium text-emerald-600">Rs. {b.paid_advances.toLocaleString()}</td>
                          <td className="py-4 text-right font-bold text-amber-600">Rs. {Math.round(b.pending).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold border-t-2 border-outline-variant">
                        <td className="pt-4">Total</td>
                        <td className="pt-4 text-center">{breakdownData.reduce((sum, b) => sum + b.working_days, 0)}</td>
                        <td className="pt-4 text-right">Rs. {Math.round(breakdownData.reduce((sum, b) => sum + b.earned_salary, 0)).toLocaleString()}</td>
                        <td className="pt-4 text-right text-emerald-600">Rs. {breakdownData.reduce((sum, b) => sum + b.paid_advances, 0).toLocaleString()}</td>
                        <td className="pt-4 text-right text-amber-600">Rs. {Math.round(breakdownData.reduce((sum, b) => sum + b.pending, 0)).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-end">
              <button 
                onClick={() => setSelectedProject(null)}
                className="px-6 py-2 bg-surface-container-highest hover:bg-surface-container-high rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
