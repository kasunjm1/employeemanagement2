import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, UserPlus, ChevronRight, X, Camera, Upload, Plus, Edit, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Role, Section } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { fetchWithAuth } from '@/src/lib/api';

const Directory = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialEmployeeState = {
    name: '',
    nickname: '',
    role: '',
    join_date: new Date().toISOString().split('T')[0],
    employee_id: '',
    mobile: '',
    whatsapp: '',
    nic: '',
    tax_residency: 'Domestic (Standard)',
    section: '',
    salary_type: 'Monthly',
    avatar_url: '',
    status: 'On-Duty'
  };

  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detail adding state
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [detailData, setDetailData] = useState({
    title: '',
    content: '',
    image_data: ''
  });

  const fetchEmployees = () => {
    fetchWithAuth('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data);
      })
      .catch(err => console.error('Error fetching employees:', err));
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

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
    fetchSections();

    // Check for edit query param
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
      fetchWithAuth(`/api/employees/${editId}`)
        .then(res => res.json())
        .then(emp => {
          if (emp && !emp.error) {
            handleEdit(emp);
          }
        });
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, avatar_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetailImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDetailData({ ...detailData, image_data: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRole = async () => {
    const name = prompt('Enter new role name:');
    if (name) {
      const res = await fetchWithAuth('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) fetchRoles();
    }
  };

  const handleAddSection = async () => {
    const name = prompt('Enter new section name:');
    if (name) {
      const res = await fetchWithAuth('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) fetchSections();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = modalMode === 'add' ? '/api/employees' : `/api/employees/${editingId}`;
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });
      
      if (res.ok) {
        const savedEmp = await res.json();
        
        // If there's detail data, save it
        if (detailData.title || detailData.content || detailData.image_data) {
          await fetchWithAuth(`/api/employees/${savedEmp.employee_id}/details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(detailData)
          });
        }

        setShowAddModal(false);
        setNewEmployee(initialEmployeeState);
        setDetailData({ title: '', content: '', image_data: '' });
        setShowDetailForm(false);
        fetchEmployees();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save employee');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setNewEmployee({
      name: emp.name,
      nickname: emp.nickname || '',
      role: emp.role,
      join_date: new Date(emp.join_date).toISOString().split('T')[0],
      employee_id: emp.employee_id,
      mobile: emp.mobile || '',
      whatsapp: emp.whatsapp || '',
      nic: emp.nic || '',
      tax_residency: emp.tax_residency || 'Domestic (Standard)',
      section: emp.section || '',
      salary_type: emp.salary_type || 'Monthly',
      avatar_url: emp.avatar_url || '',
      status: emp.status || 'On-Duty'
    });
    setEditingId(emp.employee_id);
    setModalMode('edit');
    setShowAddModal(true);
  };

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <span className="font-body text-[11px] font-semibold tracking-widest uppercase text-on-surface-variant">Organization</span>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Employee</h2>
          <p className="text-on-surface-variant max-w-md font-body leading-relaxed">Manage and view all personnel across the organization.</p>
        </div>
        <button 
          onClick={() => {
            setModalMode('add');
            setNewEmployee(initialEmployeeState);
            setShowAddModal(true);
          }}
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <UserPlus size={20} />
          Add Employee
        </button>
      </section>

      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/10 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text"
            placeholder="Search by name, role or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <Filter size={18} />
          Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((emp, i) => (
          <motion.div
            key={emp.employee_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="group bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 hover:shadow-xl hover:shadow-slate-200/50 transition-all block relative">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleEdit(emp);
                }}
                className="absolute top-4 right-4 p-2 bg-surface-container-high rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-on-primary"
              >
                <Edit size={16} />
              </button>
              <Link to={`/directory/${emp.employee_id}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/10">
                    <img src={emp.avatar_url || `https://picsum.photos/seed/${emp.employee_id}/200/200`} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline font-bold text-lg text-on-surface truncate group-hover:text-primary transition-colors">{emp.name}</h3>
                    <p className="text-sm text-on-surface-variant font-medium">{emp.role}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-outline-variant/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Department</span>
                    <span className="text-xs font-semibold text-on-surface">{emp.section}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
                <h3 className="font-headline font-bold text-2xl text-on-surface">
                  {modalMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-surface-container rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
                {/* Profile Image Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-[2rem] bg-surface-container flex items-center justify-center overflow-hidden border-2 border-dashed border-outline-variant group-hover:border-primary transition-colors">
                      {newEmployee.avatar_url ? (
                        <img src={newEmployee.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={32} className="text-on-surface-variant" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                      <Upload size={18} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                  <p className="font-body text-xs text-on-surface-variant font-bold uppercase tracking-widest">Profile Identity</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all"
                      placeholder="Samantha Richards"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Nickname</label>
                    <input 
                      type="text" 
                      value={newEmployee.nickname}
                      onChange={(e) => setNewEmployee({ ...newEmployee, nickname: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all"
                      placeholder="Sam"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Employee ID</label>
                    <input 
                      type="text" 
                      required
                      disabled={modalMode === 'edit'}
                      value={newEmployee.employee_id}
                      onChange={(e) => setNewEmployee({ ...newEmployee, employee_id: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                      placeholder="EMP-2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1 flex justify-between items-center">
                      Role
                      <button type="button" onClick={handleAddRole} className="text-primary hover:scale-110 transition-transform">
                        <Plus size={14} />
                      </button>
                    </label>
                    <select 
                      required
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all"
                    >
                      <option value="">Select Role</option>
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1 flex justify-between items-center">
                      Section
                      <button type="button" onClick={handleAddSection} className="text-primary hover:scale-110 transition-transform">
                        <Plus size={14} />
                      </button>
                    </label>
                    <select 
                      required
                      value={newEmployee.section}
                      onChange={(e) => setNewEmployee({ ...newEmployee, section: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all"
                    >
                      <option value="">Select Section</option>
                      {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Join Date</label>
                    <input 
                      type="date" 
                      required
                      value={newEmployee.join_date}
                      onChange={(e) => setNewEmployee({ ...newEmployee, join_date: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Mobile Number</label>
                    <input 
                      type="tel" 
                      value={newEmployee.mobile}
                      onChange={(e) => setNewEmployee({ ...newEmployee, mobile: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">NIC / Passport</label>
                    <input 
                      type="text" 
                      value={newEmployee.nic}
                      onChange={(e) => setNewEmployee({ ...newEmployee, nic: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all"
                      placeholder="198812345678"
                    />
                  </div>
                </div>

                {/* Add Detail Section */}
                <div className="pt-6 border-t border-outline-variant/10">
                  {!showDetailForm ? (
                    <button 
                      type="button"
                      onClick={() => setShowDetailForm(true)}
                      className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"
                    >
                      <Plus size={18} />
                      Add Detail (Documents, Notes, etc.)
                    </button>
                  ) : (
                    <div className="space-y-4 bg-surface-container-low p-6 rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-headline font-bold text-on-surface flex items-center gap-2">
                          <FileText size={18} />
                          Additional Detail
                        </h4>
                        <button type="button" onClick={() => setShowDetailForm(false)} className="text-on-surface-variant hover:text-error">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <input 
                          type="text"
                          placeholder="Detail Title (e.g. Passport Copy, Contract)"
                          value={detailData.title}
                          onChange={(e) => setDetailData({ ...detailData, title: e.target.value })}
                          className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary"
                        />
                        <textarea 
                          placeholder="Description or notes..."
                          value={detailData.content}
                          onChange={(e) => setDetailData({ ...detailData, content: e.target.value })}
                          className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary min-h-[100px]"
                        />
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <label className="flex items-center gap-2 bg-surface-container-highest px-4 py-2 rounded-lg cursor-pointer hover:bg-primary hover:text-on-primary transition-all text-xs font-bold">
                              <ImageIcon size={16} />
                              {detailData.image_data ? 'Change Image' : 'Upload Document Image'}
                              <input type="file" accept="image/*" className="hidden" onChange={handleDetailImageChange} />
                            </label>
                          </div>
                          {detailData.image_data && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-outline-variant">
                              <img src={detailData.image_data} alt="Detail" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-outline-variant/10 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 rounded-xl font-body font-bold text-on-surface-variant hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-primary text-on-primary py-4 rounded-xl font-body font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Register Employee' : 'Update Employee'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Directory;
