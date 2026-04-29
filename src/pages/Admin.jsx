import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PencilIcon, CheckIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../components/Notifications';

export default function Admin() {
  const { profile } = useAuth();
  const { notify, confirmAction } = useNotifications();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [demoteSelf, setDemoteSelf] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  const roleOptions = ['admin', 'manager', 'staff', 'viewer'];
  const statusOptions = ['pending', 'approved', 'rejected', 'removed'];

  // Redirect non-admins
  if (profile?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p>You must be an administrator to view this page.</p>
      </div>
    );
  }

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const activeAdmins = users.filter(u => u.role === 'admin' && u.status === 'approved');
  const isLastActiveAdmin = (userId) => activeAdmins.length <= 1 && activeAdmins.some(u => u.id === userId);

  const saveEdit = async () => {
    if (!editingId) return;
    const currentUser = users.find(u => u.id === editingId);
    const wouldRemoveAdminAccess = currentUser?.role === 'admin' && (editRole !== 'admin' || editStatus !== 'approved');
    if (wouldRemoveAdminAccess && isLastActiveAdmin(editingId)) {
      notify('Cannot remove admin access from the last active admin.', 'error');
      return;
    }

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ role: editRole, status: editStatus })
      .eq('id', editingId);
    if (error) {
      console.error('Failed to update user:', error);
      notify(`Failed to update user: ${error.message}`, 'error');
    } else {
      // Update local state
      setUsers(users.map(u => u.id === editingId ? { ...u, role: editRole, status: editStatus } : u));
      setEditingId(null);
      notify('User updated.', 'success');
    }
  };

  const handleTransferAdmin = async () => {
    if (!transferTarget) {
      notify('Please select a user to grant admin access to.', 'error');
      return;
    }

    try {
      // Update target user to admin
      const { error: targetError } = await supabase
        .from(TABLES.PROFILES)
        .update({ role: 'admin' })
        .eq('id', transferTarget);
      if (targetError) throw targetError;

      // If demoteSelf, update current user to manager
      if (demoteSelf) {
        const { error: selfError } = await supabase
          .from(TABLES.PROFILES)
          .update({ role: 'manager' })
          .eq('id', profile.id);
        if (selfError) throw selfError;
      }

      // Refresh users
      await fetchUsers();
      setShowTransferModal(false);
      setTransferTarget('');
      setDemoteSelf(false);
      notify(demoteSelf ? 'Admin access granted and your role was changed to manager.' : 'Admin access granted.', 'success');
    } catch (err) {
      console.error('Grant admin failed:', err);
      notify('Grant admin failed: ' + err.message, 'error');
    }
  };

  const approveUser = async (userId) => {
    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ status: 'approved' })
      .eq('id', userId);
    if (error) {
      console.error('Failed to approve user:', error);
      notify(`Failed to approve user: ${error.message}`, 'error');
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
      notify('User approved.', 'success');
    }
  };

  const removeUser = async (userId, userName) => {
    if (isLastActiveAdmin(userId)) {
      notify('Cannot remove the last active admin.', 'error');
      return;
    }

    const confirmed = await confirmAction({
      title: 'Remove user?',
      message: `Remove "${userName}"? They will no longer appear in the list but can be restored by an admin.`,
      confirmLabel: 'Remove',
      danger: true
    });
    if (!confirmed) return;
    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ status: 'removed' })
      .eq('id', userId);
    if (error) {
      console.error('Failed to remove user:', error);
      if (error.code === '23514') {
        notify('Cannot set status to removed. The database constraint needs updating before this action can complete.', 'error');
      } else {
        notify(`Failed to remove user: ${error.message}`, 'error');
      }
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'removed' } : u));
      notify(`User "${userName}" removed.`, 'success');
    }
  };

  const filteredUsers = users.filter(u => showRemoved || u.status !== 'removed');
  const approvedNonRemovedUsers = users.filter(u => u.status === 'approved' && u.id !== profile.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="btn-secondary">Refresh</button>
          <button onClick={() => setShowTransferModal(true)} className="btn-primary">Grant Admin Access</button>
        </div>
      </div>

      <div className="card bg-bar-blue/30">
        <div className="font-semibold">Active admins: {activeAdmins.length}</div>
        <p className="mt-1 text-sm text-gray-300">
          Multiple admins can exist at the same time. Grant admin access to another approved user so they can approve new accounts too.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="showRemoved"
          checked={showRemoved}
          onChange={(e) => setShowRemoved(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="showRemoved" className="text-sm text-gray-300">
          Show removed users
        </label>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-bar-blue/50">
              <tr>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-bar-blue/30 last:border-0">
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    {editingId === user.id ? (
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="input py-1">
                        {roleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-red-500/30 text-red-300' : user.role === 'manager' ? 'bg-yellow-500/30 text-yellow-300' : user.role === 'staff' ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-300'}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === user.id ? (
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="input py-1">
                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${user.status === 'approved' ? 'bg-green-500/30 text-green-300' : user.status === 'pending' ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'}`}>
                        {user.status}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    {editingId === user.id ? (
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="btn-primary py-1 px-3"><CheckIcon className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="btn-secondary py-1 px-3"><XMarkIcon className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(user)} className="btn-secondary py-1 px-3"><PencilIcon className="w-4 h-4" /> Edit</button>
                        {user.status === 'pending' && (
                          <button onClick={() => approveUser(user.id)} className="btn-primary py-1 px-3">Approve</button>
                        )}
                        {user.status !== 'removed' && user.id !== profile.id && (
                          <button
                            onClick={() => removeUser(user.id, user.email)}
                            className={`btn-secondary py-1 px-3 ${isLastActiveAdmin(user.id) ? 'opacity-50 cursor-not-allowed' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'}`}
                            title={isLastActiveAdmin(user.id) ? 'Cannot remove the last active admin' : ''}
                          >
                            <TrashIcon className="w-4 h-4" /> Remove
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500">No users found.</div>
          )}
        </div>
      )}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Grant Admin Access</h2>
            <p className="text-gray-400 mb-4">Select an approved user to grant admin privileges. Your admin access stays in place unless you choose to demote yourself.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target User</label>
                <select 
                  className="input w-full"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                >
                  <option value="">Select a user...</option>
                  {approvedNonRemovedUsers
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.email} ({user.role})
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="demoteSelf"
                  checked={demoteSelf}
                  onChange={(e) => setDemoteSelf(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="demoteSelf" className="text-sm text-gray-300">
                  Demote myself to manager after granting access
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleTransferAdmin} className="btn-primary flex-1">Grant Admin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
