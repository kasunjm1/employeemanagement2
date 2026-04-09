import React, { useState, useEffect } from 'react';
import { Plus, Building2, Calendar, ChevronRight, Search, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Account } from '@/src/types';
import { formatDate } from '@/src/lib/utils';

const AccountManagement = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicationStatus, setDuplicationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const user = JSON.parse(localStorage.getItem('ems_user') || '{}');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': user.id?.toString() || '',
    'x-account-id': user.account_id?.toString() || '',
    'x-user-role': user.role || ''
  });

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts', { headers: getHeaders() });
      if (res.ok) {
        setAccounts(await res.json());
      } else {
        setError('Failed to fetch accounts');
      }
    } catch (err) {
      setError('Network error loading accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AccountManagement component mounted');
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: newAccountName })
      });
      if (res.ok) {
        setNewAccountName('');
        setShowCreateModal(false);
        fetchAccounts();
      }
    } catch (err) {
      setError('Failed to create account');
    }
  };

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim()) return;
    try {
      const res = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setEditingAccount(null);
        fetchAccounts();
      }
    } catch (err) {
      setError('Failed to update account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this account? This will also deactivate all users associated with it.')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading accounts...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-6 relative">
      {duplicating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-headline font-bold">Duplicating Data...</h2>
            <p className="text-gray-500 font-body">This may take a few moments. Please do not close this tab.</p>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="text-[10px] text-gray-400 font-mono mb-4">
        User: {user.email} | Role: {user.role} | Account: {user.account_id}
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">System Accounts</h1>
            <p className="font-body text-on-surface-variant">Manage multi-tenant organization access</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts..."
              className="bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <button 
            disabled={duplicating}
            onClick={async () => {
              console.log('Duplication button clicked');
              if (user.role !== 'super_admin') {
                alert('You must be a super_admin to perform this action. Your current role is: ' + user.role);
                return;
              }
              const confirmed = window.confirm ? window.confirm("Duplicate all data from 'Mahamevnawa Galnewa' to 'Test'?") : true;
              if (!confirmed) {
                console.log('Duplication cancelled by user');
                return;
              }
              setDuplicating(true);
              setDuplicationStatus(null);
              console.log('Starting duplication request...');
              try {
                const res = await fetch('/api/admin/duplicate-account-data', {
                  method: 'POST',
                  headers: getHeaders()
                });
                console.log('Duplication response received:', res.status);
                const data = await res.json();
                if (res.ok) {
                  setDuplicationStatus({ type: 'success', message: data.message });
                  fetchAccounts();
                } else {
                  console.error('Duplication failed:', data);
                  setDuplicationStatus({ type: 'error', message: data.error + (data.details ? ': ' + data.details : '') });
                }
              } catch (err) {
                console.error('Duplication network error:', err);
                setDuplicationStatus({ type: 'error', message: 'Failed to trigger duplication' });
              } finally {
                setDuplicating(false);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
              duplicating 
                ? 'bg-amber-400 text-white cursor-not-allowed' 
                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200'
            }`}
          >
            {duplicating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Duplicating...
              </>
            ) : (
              <>Duplicate Galnewa to Test</>
            )}
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus size={18} />
            Create Account
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 text-error rounded-xl font-body text-sm font-bold">
          {error}
        </div>
      )}

      {duplicationStatus && (
        <div className={`p-4 rounded-xl font-body text-sm font-bold flex items-center justify-between ${
          duplicationStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{duplicationStatus.message}</span>
          <button onClick={() => setDuplicationStatus(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface-container-lowest p-8 rounded-[2rem] w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">Create New Account</h2>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Organization Name</label>
                <input 
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Enter organization name..."
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-surface-container-high rounded-xl font-bold hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/10 hover:bg-primary/90 transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {editingAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface-container-lowest p-8 rounded-[2rem] w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">Edit Account</h2>
            <form onSubmit={handleEditAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Account Name</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 px-4 py-3 bg-surface-container-high rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-on-primary rounded-xl font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map((account, i) => (
          <motion.div 
            key={account.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <Building2 size={24} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingAccount(account);
                    setEditName(account.name);
                  }}
                  className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                  title="Edit Account"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteAccount(account.id)}
                  className="p-2 hover:bg-error/10 rounded-lg text-error transition-colors"
                  title="Delete Account"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">{account.name}</h3>
            
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6">
              <Calendar size={14} />
              <span>Created {formatDate(account.created_at)}</span>
            </div>

            <button className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors">
              Manage Organization
              <ChevronRight size={18} className="text-primary" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AccountManagement;
