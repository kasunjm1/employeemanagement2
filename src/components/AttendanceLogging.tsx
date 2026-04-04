import React, { useEffect, useState } from 'react';
import { UserPlus, Calendar, CheckCircle2, Clock, XCircle, ChevronRight, Briefcase, LogIn, LogOut, Users, Fingerprint, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Employee, Attendance, Project } from '@/src/types';
import { cn, formatTime } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const AttendanceLogging = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentLogs, setRecentLogs] = useState<Attendance[]>([]);
  const [historyLogs, setHistoryLogs] = useState<Attendance[]>([]);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    id: null as number | null,
    employee_id: '',
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
            employee_id: '', 
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
      const res = await fetchWithAuth(`/api/employees/${emp.employee_id}/attendance-status`);
      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        employee_id: emp.employee_id,
        section_id: data.last_section_id || 0,
        project_id: data.last_project_id || 0,
        id: data.today?.id || null,
        check_in: data.today?.check_in || '',
        check_out: data.today?.check_out || ''
      }));
    } catch (err) {
      console.error('Error fetching employee status:', err);
      setFormData(prev => ({ ...prev, employee_id: emp.employee_id, section_id: 0, project_id: 0 }));
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Attendance Management</h2>
          <p className="text-on-surface-variant text-sm font-body">Manage daily attendance records via manual entry or fingerprint scan.</p>
        </div>
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
      </section>

      <div className="grid grid-cols-1 gap-6">
        {/* Compact Entry Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant"
        >
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Employee Selection & Search */}
            <div className="w-full lg:w-1/3 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/10 flex-shrink-0 bg-surface-container-high">
                {selectedEmployee ? (
                  <img 
                    src={selectedEmployee.avatar_url || `https://picsum.photos/seed/${selectedEmployee.employee_id}/200/200`} 
                    alt={selectedEmployee.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
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
                          employee_id: '', 
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
                        key={emp.employee_id}
                        onClick={() => handleEmployeeSelect(emp)}
                        className="px-4 py-3 hover:bg-surface-container-high cursor-pointer flex items-center gap-3 border-b border-outline-variant last:border-none"
                      >
                        <img 
                          src={emp.avatar_url || `https://picsum.photos/seed/${emp.employee_id}/200/200`} 
                          alt={emp.name} 
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
                    className="w-full bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
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
                    className="w-full bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
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
          <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
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
          
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-transparent">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-surface-container-low shadow-sm">
                <tr className="border-b border-outline-variant">
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Project</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">In Time</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Out Time</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant text-sm font-medium">
                      No records found for this date.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={log.avatar_url || `https://picsum.photos/seed/${log.employee_id}/200/200`} 
                            alt={log.name} 
                            className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                          />
                          <span className="text-sm font-bold text-on-surface">{log.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">{log.employee_id}</td>
                      <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">{log.project || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <LogIn size={12} />
                          {formatTime(log.check_in)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.check_out ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                            <LogOut size={12} />
                            {formatTime(log.check_out)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-outline uppercase tracking-tighter italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            const emp = employees.find(e => e.employee_id === log.employee_id);
                            if (emp) handleEmployeeSelect(emp);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit Record"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLogging;
