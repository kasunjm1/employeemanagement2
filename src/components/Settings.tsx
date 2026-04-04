import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings as SettingsIcon, Users, Building2, Shield, Pencil, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role, Section, User, Project } from '@/src/types';

const Settings = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    roles: false,
    sections: false,
    projects: false,
    users: false,
    system: false
  });
  const [newRole, setNewRole] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newProject, setNewProject] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'standard',
    account_id: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<{id: number, name: string}[]>([]);
  const [appSettings, setAppSettings] = useState({
    half_day_threshold: '10:00'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const user = JSON.parse(localStorage.getItem('ems_user') || '{}');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': user.id?.toString() || '',
    'x-account-id': user.account_id?.toString() || '',
    'x-user-role': user.role || ''
  });

  const fetchData = async () => {
    try {
      const [rolesRes, sectionsRes, projectsRes, usersRes, settingsRes] = await Promise.all([
        fetch('/api/roles', { headers: getHeaders() }),
        fetch('/api/sections', { headers: getHeaders() }),
        fetch('/api/projects', { headers: getHeaders() }),
        fetch('/api/users', { headers: getHeaders() }),
        fetch('/api/settings', { headers: getHeaders() })
      ]);

      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (sectionsRes.ok) setSections(await sectionsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (settingsRes.ok) setAppSettings(await settingsRes.json());

      if (user.role === 'super_admin') {
        const accountsRes = await fetch('/api/accounts', { headers: getHeaders() });
        if (accountsRes.ok) setAccounts(await accountsRes.json());
      }
    } catch (err) {
      setError('Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: newRole })
      });
      if (res.ok) {
        setNewRole('');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add role');
      }
    } catch (err) {
      setError('Failed to add role');
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.trim()) return;
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: newSection })
      });
      if (res.ok) {
        setNewSection('');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add section');
      }
    } catch (err) {
      setError('Failed to add section');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.trim()) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: newProject })
      });
      if (res.ok) {
        setNewProject('');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add project');
      }
    } catch (err) {
      setError('Failed to add project');
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      setError('Failed to delete role');
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      const res = await fetch(`/api/sections/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      setError('Failed to delete section');
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editingRole.name.trim()) return;
    try {
      const res = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name: editingRole.name })
      });
      if (res.ok) {
        setEditingRole(null);
        fetchData();
      }
    } catch (err) {
      setError('Failed to update role');
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editingSection.name.trim()) return;
    try {
      const res = await fetch(`/api/sections/${editingSection.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name: editingSection.name })
      });
      if (res.ok) {
        setEditingSection(null);
        fetchData();
      }
    } catch (err) {
      setError('Failed to update section');
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name.trim()) return;
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name: editingProject.name })
      });
      if (res.ok) {
        setEditingProject(null);
        fetchData();
      }
    } catch (err) {
      setError('Failed to update project');
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = userModalMode === 'add' ? '/api/users' : `/api/users/${editingUser?.id}`;
      const method = userModalMode === 'add' ? 'POST' : 'PUT';
      
      const payload = { ...userFormData };
      if (userModalMode === 'edit' && user.role !== 'super_admin') {
        delete (payload as any).password;
      } else if (userModalMode === 'edit' && user.role === 'super_admin' && !payload.password) {
        delete (payload as any).password;
      }

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowUserModal(false);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save user');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const openAddUser = () => {
    setUserModalMode('add');
    setUserFormData({
      email: '',
      password: '',
      name: '',
      role: 'standard',
      account_id: user.account_id?.toString() || ''
    });
    setShowUserModal(true);
  };

  const openEditUser = (u: User) => {
    setUserModalMode('edit');
    setEditingUser(u);
    setUserFormData({
      email: u.email,
      password: '',
      name: u.name,
      role: u.role,
      account_id: u.account_id?.toString() || ''
    });
    setShowUserModal(true);
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        setAppSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (err) {
      setError('Failed to update setting');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <SettingsIcon size={32} />
        </div>
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">Account Settings</h1>
          <p className="font-body text-on-surface-variant">Manage your organization's structure and access</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 text-error rounded-xl font-body text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Roles Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm h-fit"
        >
          <div 
            className="flex items-center justify-between mb-6 cursor-pointer group"
            onClick={() => toggleSection('roles')}
          >
            <div className="flex items-center gap-3">
              <Shield className="text-primary" size={24} />
              <h2 className="font-headline text-xl font-bold text-on-surface">Employee Roles</h2>
            </div>
            <div className="p-1.5 rounded-full hover:bg-surface-container transition-colors">
              {expandedSections.roles ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          <AnimatePresence initial={false}>
            {expandedSections.roles && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAddRole} className="flex gap-2 mb-6">
                  <input 
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="New role name..."
                    className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="submit" className="p-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors">
                    <Plus size={20} />
                  </button>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group/item">
                      {editingRole?.id === role.id ? (
                        <form onSubmit={handleUpdateRole} className="flex-1 flex gap-2">
                          <input 
                            type="text"
                            value={editingRole.name}
                            onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                            className="flex-1 bg-white border border-primary rounded-lg px-2 py-1 text-sm focus:outline-none"
                            autoFocus
                          />
                          <button type="submit" className="text-primary font-bold text-xs">Save</button>
                          <button type="button" onClick={() => setEditingRole(null)} className="text-on-surface-variant text-xs">Cancel</button>
                        </form>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-on-surface">{role.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                            <button 
                              onClick={() => setEditingRole(role)}
                              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteRole(role.id)}
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sections Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm h-fit"
        >
          <div 
            className="flex items-center justify-between mb-6 cursor-pointer group"
            onClick={() => toggleSection('sections')}
          >
            <div className="flex items-center gap-3">
              <Building2 className="text-primary" size={24} />
              <h2 className="font-headline text-xl font-bold text-on-surface">Departments / Sections</h2>
            </div>
            <div className="p-1.5 rounded-full hover:bg-surface-container transition-colors">
              {expandedSections.sections ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections.sections && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAddSection} className="flex gap-2 mb-6">
                  <input 
                    type="text"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    placeholder="New section name..."
                    className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="submit" className="p-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors">
                    <Plus size={20} />
                  </button>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group/item">
                      {editingSection?.id === section.id ? (
                        <form onSubmit={handleUpdateSection} className="flex-1 flex gap-2">
                          <input 
                            type="text"
                            value={editingSection.name}
                            onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                            className="flex-1 bg-white border border-primary rounded-lg px-2 py-1 text-sm focus:outline-none"
                            autoFocus
                          />
                          <button type="submit" className="text-primary font-bold text-xs">Save</button>
                          <button type="button" onClick={() => setEditingSection(null)} className="text-on-surface-variant text-xs">Cancel</button>
                        </form>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-on-surface">{section.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                            <button 
                              onClick={() => setEditingSection(section)}
                              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteSection(section.id)}
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Projects Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm h-fit"
        >
          <div 
            className="flex items-center justify-between mb-6 cursor-pointer group"
            onClick={() => toggleSection('projects')}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="text-primary" size={24} />
              <h2 className="font-headline text-xl font-bold text-on-surface">Working Projects</h2>
            </div>
            <div className="p-1.5 rounded-full hover:bg-surface-container transition-colors">
              {expandedSections.projects ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections.projects && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAddProject} className="flex gap-2 mb-6">
                  <input 
                    type="text"
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    placeholder="New project name..."
                    className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="submit" className="p-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors">
                    <Plus size={20} />
                  </button>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group/item">
                      {editingProject?.id === project.id ? (
                        <form onSubmit={handleUpdateProject} className="flex-1 flex gap-2">
                          <input 
                            type="text"
                            value={editingProject.name}
                            onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                            className="flex-1 bg-white border border-primary rounded-lg px-2 py-1 text-sm focus:outline-none"
                            autoFocus
                          />
                          <button type="submit" className="text-primary font-bold text-xs">Save</button>
                          <button type="button" onClick={() => setEditingProject(null)} className="text-on-surface-variant text-xs">Cancel</button>
                        </form>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-on-surface">{project.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                            <button 
                              onClick={() => setEditingProject(project)}
                              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProject(project.id)}
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Users Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm h-fit"
        >
          <div 
            className="flex items-center justify-between mb-6 cursor-pointer group"
            onClick={() => toggleSection('users')}
          >
            <div className="flex items-center gap-3">
              <Users className="text-primary" size={24} />
              <h2 className="font-headline text-xl font-bold text-on-surface">User Management</h2>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openAddUser();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors"
              >
                <Plus size={18} />
                Add User
              </button>
              <div className="p-1.5 rounded-full hover:bg-surface-container transition-colors">
                {expandedSections.users ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections.users && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/10">
                        <th className="py-4 px-4 font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest">Name</th>
                        <th className="py-4 px-4 font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest">Email</th>
                        <th className="py-4 px-4 font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest">Role</th>
                        <th className="py-4 px-4 font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest">Account</th>
                        <th className="py-4 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-outline-variant/5 hover:bg-surface-container-low transition-colors">
                          <td className="py-4 px-4 text-sm font-semibold text-on-surface">{u.name}</td>
                          <td className="py-4 px-4 text-sm text-on-surface-variant">{u.email}</td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                              u.role === 'super_admin' ? "bg-purple-100 text-purple-700" :
                              u.role === 'admin' ? "bg-blue-100 text-blue-700" :
                              "bg-slate-100 text-slate-700"
                            )}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-on-surface-variant">{(u as any).account_name || 'N/A'}</td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => openEditUser(u)}
                                className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* System Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="md:col-span-2 bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm h-fit"
        >
          <div 
            className="flex items-center justify-between mb-6 cursor-pointer group"
            onClick={() => toggleSection('system')}
          >
            <div className="flex items-center gap-3">
              <SettingsIcon className="text-primary" size={24} />
              <h2 className="font-headline text-xl font-bold text-on-surface">System Configuration</h2>
            </div>
            <div className="p-1.5 rounded-full hover:bg-surface-container transition-colors">
              {expandedSections.system ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections.system && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-on-surface">Half-Day Threshold</label>
                      <p className="text-xs text-on-surface-variant">If an employee checks in after this time, it's considered a half-day.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="time"
                        value={appSettings.half_day_threshold}
                        onChange={(e) => handleUpdateSetting('half_day_threshold', e.target.value)}
                        className="bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      {savingSettings && <span className="text-[10px] text-primary animate-pulse font-bold uppercase">Saving...</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl"
          >
            <h3 className="font-headline text-2xl font-bold mb-6">{userModalMode === 'add' ? 'Add New User' : 'Edit User'}</h3>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Full Name</label>
                <input 
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Email Address</label>
                <input 
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm"
                />
              </div>
              {(userModalMode === 'add' || user.role === 'super_admin') && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">
                    {userModalMode === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
                  </label>
                  <input 
                    type="password"
                    required={userModalMode === 'add'}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">System Role</label>
                <select 
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm"
                >
                  <option value="standard">Standard User</option>
                  <option value="admin">Administrator</option>
                  {user.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
              </div>
              {user.role === 'super_admin' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Account Assignment</label>
                  <select 
                    value={userFormData.account_id}
                    onChange={(e) => setUserFormData({ ...userFormData, account_id: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-2 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-primary text-on-primary rounded-xl font-bold shadow-lg"
                >
                  {userModalMode === 'add' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Settings;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
