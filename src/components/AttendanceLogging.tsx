import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Calendar, CheckCircle2, Clock, XCircle, ChevronRight, Briefcase, LogIn, LogOut, Users, Fingerprint, RefreshCw, History, X, Download, FileText, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { Employee, Attendance, Project } from '@/src/types';
import { cn, formatTime } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';
import { exportToExcel, exportToPDF } from '@/src/lib/reportUtils';

const AttendanceLogging = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentLogs, setRecentLogs] = useState<Attendance[]>([]);
  const [historyLogs, setHistoryLogs] = useState<Attendance[]>([]);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    id: null as number | null,
    employee_id: 0,
    section_id: 0,
    project_id: 0,
    check_in: '',
    check_out: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [fingerprintId, setFingerprintId] = useState('');
  const [fingerprintStatus, setFingerprintStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isFingerprintLoading, setIsFingerprintLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [bulkFormData, setBulkFormData] = useState({
    project_id: 0,
    check_in: '08:00',
    check_out: '17:00',
    date: new Date().toISOString().split('T')[0],
    status: 'Present'
  });
  const [appSettings, setAppSettings] = useState({
    default_check_in: '08:00',
    default_check_out: '17:00'
  });
  const [employeeHistory, setEmployeeHistory] = useState<Attendance[]>([]);
  const [historyEmployeeName, setHistoryEmployeeName] = useState('');

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
    handleFetch('/api/settings', (data) => {
      setAppSettings(data);
      if (data.default_check_in || data.default_check_out) {
        setBulkFormData(prev => ({
          ...prev,
          check_in: data.default_check_in || prev.check_in,
          check_out: data.default_check_out || prev.check_out
        }));
      }
    });
    
    const fetchHistory = (date: string) => {
      fetchWithAuth(`/api/attendance?date=${date}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const unique = data.reduce((acc: Attendance[], current: Attendance) => {
              if (!acc.find(item => item.id === current.id)) return acc.concat([current]);
              return acc;
            }, []);
            setHistoryLogs(unique);
          }
        });
    };

    fetchHistory(historyDate);
    
    handleFetch('/api/projects', (data) => {
      setProjects(data);
    });
    
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.employee-search-container')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [historyDate]);

  const handleExportExcel = async () => {
    const columns = [
      { header: 'Profile', dataKey: 'avatar_url', isImage: true },
      { header: 'Date', dataKey: 'date' },
      { header: 'Employee ID', dataKey: 'employee_number' },
      { header: 'Name', dataKey: 'name' },
      { header: 'Project', dataKey: 'project' },
      { header: 'In Time', dataKey: 'check_in' },
      { header: 'Out Time', dataKey: 'check_out' },
      { header: 'Allowance', dataKey: 'allowance' },
      { header: 'Status', dataKey: 'status' }
    ];
    const data = historyLogs.map(log => ({
      ...log,
      check_in: log.check_in ? formatTime(log.check_in) : '-',
      check_out: log.check_out ? formatTime(log.check_out) : '-',
      project: log.project || 'N/A',
      status: log.status || 'Present'
    }));
    await exportToExcel(data, columns, `Attendance_Report_${historyDate}`);
  };

  const handleExportPDF = async () => {
    const columns = [
      { header: '', dataKey: 'avatar_url', isImage: true },
      { header: 'ID', dataKey: 'employee_number' },
      { header: 'Name', dataKey: 'name' },
      { header: 'Project', dataKey: 'project' },
      { header: 'In', dataKey: 'check_in' },
      { header: 'Out', dataKey: 'check_out' },
      { header: 'Status', dataKey: 'status' }
    ];
    const data = historyLogs.map(log => ({
      ...log,
      check_in: log.check_in ? formatTime(log.check_in) : '-',
      check_out: log.check_out ? formatTime(log.check_out) : '-',
      project: log.project || 'N/A',
      status: log.status || 'Present'
    }));
    await exportToPDF(data, columns, `Attendance Report - ${historyDate}`, `Attendance_Report_${historyDate}`);
  };

  const getISTTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Kolkata', 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSubmit = async (e?: React.FormEvent, type?: 'in' | 'out') => {
    if (e) e.preventDefault();
    
    const dataToSubmit = { ...formData };
    const currentTime = getISTTime();

    if (type === 'in' && !dataToSubmit.check_in) {
      dataToSubmit.check_in = currentTime;
    } else if (type === 'out' && !dataToSubmit.check_out) {
      dataToSubmit.check_out = currentTime;
    }

    try {
      const url = dataToSubmit.id ? `/api/attendance/${dataToSubmit.id}` : '/api/attendance';
      const method = dataToSubmit.id ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dataToSubmit,
          status: 'Present'
        })
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const newLog = await res.json();
          
          // Refresh history and stats
          const fetchHistory = (date: string) => {
            fetchWithAuth(`/api/attendance?date=${date}`)
              .then(res => res.json())
              .then(data => {
                if (Array.isArray(data)) {
                  const unique = data.reduce((acc: Attendance[], current: Attendance) => {
                    if (!acc.find(item => item.id === current.id)) return acc.concat([current]);
                    return acc;
                  }, []);
                  setHistoryLogs(unique);
                }
              });
          };
          fetchHistory(historyDate);

          setFormData({ 
            id: null,
            employee_id: 0, 
            section_id: 0,
            project_id: 0, 
            check_in: '', 
            check_out: '',
            date: new Date().toISOString().split('T')[0]
          });
          setSearchTerm('');
          setSelectedEmployee(null);
        }
      }
    } catch (err) {
      console.error('Error submitting attendance:', err);
    }
  };

  const handleEmployeeSelect = async (emp: Employee) => {
    setSearchTerm(`${emp.name} (${emp.employee_id})`);
    setShowSearchResults(false);
    setSelectedEmployee(emp);
    
    try {
      const res = await fetchWithAuth(`/api/employees/${emp.id}/attendance-status`);
      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        employee_id: emp.id,
        section_id: data.last_section_id || 0,
        project_id: data.last_project_id || 0,
        id: data.today?.id || null,
        check_in: data.today?.check_in || '',
        check_out: data.today?.check_out || ''
      }));
    } catch (err) {
      console.error('Error fetching employee status:', err);
      setFormData(prev => ({ ...prev, employee_id: emp.id, section_id: 0, project_id: 0 }));
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFingerprintScan = async () => {
    if (!fingerprintId) return;
    setIsFingerprintLoading(true);
    setFingerprintStatus(null);
    try {
      const res = await fetchWithAuth('/api/attendance/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: fingerprintId })
      });
      const data = await res.json();
      if (res.ok) {
        setFingerprintStatus({ message: data.message, type: 'success' });
        setRecentLogs(prev => {
          const filtered = prev.filter(log => log.id !== data.data.id);
          return [data.data, ...filtered].slice(0, 5);
        });
        setFingerprintId('');
      } else {
        setFingerprintStatus({ message: data.error || 'Scan failed', type: 'error' });
      }
    } catch (err) {
      setFingerprintStatus({ message: 'Connection error', type: 'error' });
    } finally {
      setIsFingerprintLoading(false);
    }
  };

  const fetchEmployeeHistory = async (employeeId: number, employeeName: string) => {
    try {
      const res = await fetchWithAuth(`/api/attendance?employee_id=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeeHistory(data);
        setHistoryEmployeeName(employeeName);
        setShowHistoryModal(true);
      }
    } catch (err) {
      console.error('Error fetching employee history:', err);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) return;

    setIsFingerprintLoading(true);
    try {
      const promises = selectedEmployees.map(empId => 
        fetchWithAuth('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: empId,
            project_id: bulkFormData.project_id,
            check_in: bulkFormData.check_in,
            check_out: bulkFormData.check_out,
            date: bulkFormData.date,
            status: bulkFormData.status
          })
        })
      );

      await Promise.all(promises);
      
      // Refresh history
      const res = await fetchWithAuth(`/api/attendance?date=${historyDate}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const unique = data.reduce((acc: Attendance[], current: Attendance) => {
          if (!acc.find(item => item.id === current.id)) return acc.concat([current]);
          return acc;
        }, []);
        setHistoryLogs(unique);
      }

      setShowBulkModal(false);
      setSelectedEmployees([]);
      setBulkFormData({
        project_id: 0,
        check_in: appSettings.default_check_in || '08:00',
        check_out: appSettings.default_check_out || '17:00',
        date: new Date().toISOString().split('T')[0],
        status: 'Present'
      });
    } catch (err) {
      console.error('Error submitting bulk attendance:', err);
    } finally {
      setIsFingerprintLoading(false);
    }
  };

  const toggleEmployeeSelection = (id: number) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-2">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">Attendance Management</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 bg-primary dark:bg-primary-container text-on-primary dark:text-on-primary-container px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <UserPlus size={18} />
            Bulk Entry
          </button>
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-xl border border-outline-variant">
          <Calendar className="text-primary" size={18} />
          <div className="flex flex-col">
            <label className="text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter leading-none">Logging Date</label>
            <input 
              type="date"
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value });
                setHistoryDate(e.target.value);
              }}
              className="bg-transparent border-none text-sm font-bold text-on-surface focus:ring-0 p-0 h-5 w-32 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </section>

      <div className="grid grid-cols-1 gap-3">
        {/* Compact Entry Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-3xl p-4 shadow-sm border border-outline-variant"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Employee Selection & Search */}
            <div className="w-full lg:w-1/3 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/10 flex-shrink-0 bg-surface-container-high">
                {selectedEmployee ? (
                  <Link to={`/directory/${selectedEmployee.id}`}>
                    <img 
                      src={selectedEmployee.avatar_url || `https://picsum.photos/seed/${selectedEmployee.id}/200/200`} 
                      alt={selectedEmployee.name} 
                      className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline">
                    <Users size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 relative employee-search-container">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Employee Search / Scan</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search name, ID or Scan..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSearchResults(true);
                      if (!e.target.value) {
                        setFormData({ 
                          id: null,
                          employee_id: 0, 
                          section_id: 0,
                          project_id: 0, 
                          check_in: '', 
                          check_out: '',
                          date: new Date().toISOString().split('T')[0]
                        });
                        setSelectedEmployee(null);
                      }
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="w-full bg-surface-container-highest border-none rounded-xl pl-3 pr-10 py-3 text-sm font-medium focus:ring-2 focus:ring-primary transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchTerm && (
                      <button onClick={() => { setSearchTerm(''); setSelectedEmployee(null); }} className="text-outline hover:text-primary p-1">
                        <XCircle size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (searchTerm) {
                          setFingerprintId(searchTerm);
                          handleFingerprintScan();
                        }
                      }}
                      className="text-primary hover:bg-primary/10 p-1 rounded-lg transition-colors"
                      title="Quick Scan"
                    >
                      <Fingerprint size={18} />
                    </button>
                  </div>
                </div>
                
                {showSearchResults && searchTerm && filteredEmployees.length > 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredEmployees.map(emp => (
                      <div 
                        key={emp.id}
                        onClick={() => handleEmployeeSelect(emp)}
                        className="px-4 py-3 hover:bg-surface-container-high cursor-pointer flex items-center gap-3 border-b border-outline-variant last:border-none"
                      >
                        <Link 
                          to={`/directory/${emp.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        >
                          <img 
                            src={emp.avatar_url || `https://picsum.photos/seed/${emp.id}/200/200`} 
                            alt={emp.name} 
                            className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                        </Link>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{emp.name}</span>
                          <span className="text-[10px] text-on-surface-variant">{emp.employee_id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Working Project</label>
                <div className="relative">
                  <select 
                    value={formData.project_id || 0}
                    onChange={(e) => setFormData({ ...formData, project_id: parseInt(e.target.value) })}
                    className="w-full bg-surface-container-highest border-none rounded-xl pl-3 pr-8 py-3 text-sm font-medium focus:ring-2 focus:ring-primary appearance-none"
                  >
                    <option value="0">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline" size={16} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">In Time (IST)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <input 
                        type="time"
                        value={formData.check_in}
                        onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                        className="w-full bg-surface-container-highest border-none rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, check_in: getISTTime() })}
                      className="px-2 bg-surface-container-high rounded-xl text-[10px] font-bold hover:bg-primary/10 transition-colors"
                    >
                      Now
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleSubmit(undefined, 'in')}
                    className="w-full bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn size={14} />
                    In
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Out Time (IST)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <input 
                        type="time"
                        value={formData.check_out}
                        onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                        className="w-full bg-surface-container-highest border-none rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, check_out: getISTTime() })}
                      className="px-2 bg-surface-container-high rounded-xl text-[10px] font-bold hover:bg-primary/10 transition-colors"
                    >
                      Now
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleSubmit(undefined, 'out')}
                    className="w-full bg-amber-600 dark:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} />
                    Out
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {fingerprintStatus && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={cn(
                "mt-4 p-2 rounded-lg text-xs font-bold text-center",
                fingerprintStatus.type === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              )}
            >
              {fingerprintStatus.message}
            </motion.div>
          )}
        </motion.div>

        {/* Attendance Summary Table */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-3">
              <RefreshCw 
                size={18} 
                className={cn("text-primary cursor-pointer", isFingerprintLoading && "animate-spin")} 
                onClick={() => {
                  setHistoryLogs([]);
                  fetchWithAuth(`/api/attendance?date=${historyDate}`).then(res => res.json()).then(data => setHistoryLogs(data));
                }}
              />
              <h3 className="font-headline font-bold text-lg">Attendance Summary</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-surface-container-highest rounded-xl p-1 border border-outline-variant/10">
                <button 
                  onClick={handleExportExcel}
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-all flex items-center gap-2 text-[10px] font-bold"
                  title="Export Excel"
                >
                  <Download size={14} />
                  Excel
                </button>
                <div className="w-px h-3 bg-outline-variant/20 mx-1" />
                <button 
                  onClick={handleExportPDF}
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-all flex items-center gap-2 text-[10px] font-bold"
                  title="Export PDF"
                >
                  <FileText size={14} />
                  PDF
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">View Date:</label>
                <input 
                  type="date" 
                  value={historyDate}
                  onChange={(e) => {
                    setHistoryDate(e.target.value);
                    setFormData(prev => ({ ...prev, date: e.target.value }));
                  }}
                  className="bg-surface-container-highest border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-transparent">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-surface-container-low shadow-sm">
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Employee</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">ID</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Project</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">In Time</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Out Time</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Status</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-on-surface-variant text-sm font-medium">
                      No records found for this date.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-4 py-2">
                        <Link to={`/directory/${log.employee_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <img 
                            src={log.avatar_url || `https://picsum.photos/seed/${log.employee_id}/200/200`} 
                            alt={log.name} 
                            className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-sm font-bold text-on-surface">{log.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-xs font-medium text-on-surface-variant">{log.employee_number}</td>
                      <td className="px-4 py-2 text-xs font-medium text-on-surface-variant">{log.project || 'N/A'}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <LogIn size={12} />
                          {formatTime(log.check_in)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {log.check_out ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                            <LogOut size={12} />
                            {formatTime(log.check_out)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-outline uppercase tracking-tighter italic">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest w-fit",
                            log.status === 'Half-Day' ? "bg-amber-100 text-amber-700" : 
                            log.status === 'Absent' ? "bg-error/10 text-error" :
                            "bg-emerald-100 text-emerald-700"
                          )}>
                            {log.status || 'Present'}
                          </span>
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-tighter opacity-70",
                            log.check_out ? "text-emerald-600" : "text-amber-600"
                          )}>
                            {log.check_out ? 'Completed' : 'On-Site'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const emp = employees.find(e => e.id === log.employee_id);
                              if (emp) handleEmployeeSelect(emp);
                            }}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit Record"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={() => fetchEmployeeHistory(log.employee_id, log.name || '')}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Attendance History"
                          >
                            <History size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                <History className="text-primary" size={24} />
                <div>
                  <h3 className="font-headline font-bold text-xl">Attendance History</h3>
                  <p className="text-xs text-on-surface-variant font-medium">{historyEmployeeName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="pb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
                    <th className="pb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Project</th>
                    <th className="pb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">In Time</th>
                    <th className="pb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Out Time</th>
                    <th className="pb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Allowance</th>
                    <th className="pb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {employeeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-on-surface-variant text-sm">No history records found.</td>
                    </tr>
                  ) : (
                    employeeHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-2 text-sm font-bold text-on-surface">
                          {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2 text-xs font-medium text-on-surface-variant">{log.project || 'N/A'}</td>
                        <td className="py-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <LogIn size={12} />
                            {formatTime(log.check_in)}
                          </span>
                        </td>
                        <td className="py-2">
                          {log.check_out ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                              <LogOut size={12} />
                              {formatTime(log.check_out)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-outline uppercase tracking-tighter italic">Pending</span>
                          )}
                        </td>
                        <td className="py-2">
                          {log.allowance > 0 ? (
                            <span className="text-xs font-bold text-primary">
                              LKR {Number(log.allowance).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-outline">-</span>
                          )}
                        </td>
                        <td className="py-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest w-fit",
                            log.status === 'Half-Day' ? "bg-amber-100 text-amber-700" : 
                            log.status === 'Absent' ? "bg-error/10 text-error" :
                            "bg-emerald-100 text-emerald-700"
                          )}>
                            {log.status || 'Present'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex justify-end">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-container transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Entry Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                <Users className="text-primary" size={24} />
                <div>
                  <h3 className="font-headline font-bold text-xl">Bulk Attendance Entry</h3>
                  <p className="text-xs text-on-surface-variant font-medium">Select multiple employees and log attendance at once.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkModal(false)}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Left: Employee Selection */}
              <div className="w-full lg:w-1/2 border-r border-outline-variant flex flex-col p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
                  <input 
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {selectedEmployees.length} Selected
                  </span>
                  <button 
                    onClick={() => {
                      if (selectedEmployees.length === employees.length) {
                        setSelectedEmployees([]);
                      } else {
                        setSelectedEmployees(employees.map(e => e.id));
                      }
                    }}
                    className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                  >
                    {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-transparent">
                  {filteredEmployees.map(emp => (
                    <div 
                      key={emp.id}
                      onClick={() => toggleEmployeeSelection(emp.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                        selectedEmployees.includes(emp.id) 
                          ? "bg-primary/10 border-primary shadow-sm" 
                          : "bg-surface-container-low border-outline-variant/50 hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                        selectedEmployees.includes(emp.id) ? "bg-primary border-primary" : "border-outline"
                      )}>
                        {selectedEmployees.includes(emp.id) && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <img 
                        src={emp.avatar_url || `https://picsum.photos/seed/${emp.id}/200/200`} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">{emp.name}</span>
                        <span className="text-[10px] text-on-surface-variant">{emp.employee_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Entry Details */}
              <div className="w-full lg:w-1/2 p-6 bg-surface-container-low/30 flex flex-col">
                <form onSubmit={handleBulkSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Date</label>
                      <input 
                        type="date"
                        value={bulkFormData.date}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, date: e.target.value })}
                        className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</label>
                      <select 
                        value={bulkFormData.status}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, status: e.target.value })}
                        className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                      >
                        <option value="Present">Present</option>
                        <option value="Half-Day">Half-Day</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Project</label>
                    <select 
                      value={bulkFormData.project_id}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, project_id: parseInt(e.target.value) })}
                      className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                    >
                      <option value="0">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">In Time</label>
                      <div className="flex gap-2">
                        <input 
                          type="time"
                          value={bulkFormData.check_in}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, check_in: e.target.value })}
                          className="flex-1 bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                        />
                        <button 
                          type="button"
                          onClick={() => setBulkFormData({ ...bulkFormData, check_in: getISTTime() })}
                          className="px-3 bg-surface-container-high rounded-xl text-[10px] font-bold hover:bg-primary/10 transition-colors"
                        >
                          Now
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Out Time</label>
                      <div className="flex gap-2">
                        <input 
                          type="time"
                          value={bulkFormData.check_out}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, check_out: e.target.value })}
                          className="flex-1 bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                        />
                        <button 
                          type="button"
                          onClick={() => setBulkFormData({ ...bulkFormData, check_out: getISTTime() })}
                          className="px-3 bg-surface-container-high rounded-xl text-[10px] font-bold hover:bg-primary/10 transition-colors"
                        >
                          Now
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-outline-variant">
                    <div className="bg-surface-container-high p-4 rounded-2xl mb-6">
                      <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Summary</h5>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-on-surface">Employees to Log:</span>
                        <span className="text-lg font-bold text-primary">{selectedEmployees.length}</span>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isFingerprintLoading || selectedEmployees.length === 0}
                      className="w-full bg-primary dark:bg-primary-container text-on-primary dark:text-on-primary-container py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isFingerprintLoading ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Submit Bulk Attendance
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLogging;
