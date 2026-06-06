import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PencilIcon, CheckIcon, XMarkIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../components/Notifications';
import Modal from '../components/Modal';
import DataCard from '../components/DataCard';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';

const roleBadge = (role) => (
  <span className={`badge ${role === 'admin' ? 'bg-red-500/30 text-red-300' : role === 'manager' ? 'bg-yellow-500/30 text-yellow-300' : role === 'staff' ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-300'}`}>
    {role}
  </span>
);

const statusBadge = (status) => (
  <span className={`badge ${status === 'approved' ? 'bg-green-500/30 text-green-300' : status === 'pending' ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'}`}>
    {status}
  </span>
);

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

    const targetUser = approvedNonRemovedUsers.find(u => u.id === transferTarget)
    if (!demoteSelf && targetUser?.role === 'admin') {
      notify('That user is already an admin.', 'error')
      return
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

  // Role/status selects shown while editing a user (shared by table + cards).
  const renderEditSelects = (compact = false) => (
    <>
      <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className={`select ${compact ? '' : 'flex-1'}`}>
        {roleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={`select ${compact ? '' : 'flex-1'}`}>
        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </>
  );

  // Action buttons for a user (shared by table + cards).
  const renderActions = (user) => (
    editingId === user.id ? (
      <>
        <button onClick={saveEdit} className="btn-primary flex-1 md:flex-none"><CheckIcon className="w-5 h-5" /> Save</button>
        <button onClick={cancelEdit} className="btn-secondary flex-1 md:flex-none"><XMarkIcon className="w-5 h-5" /> Cancel</button>
      </>
    ) : (
      <>
        <button onClick={() => startEdit(user)} className="btn-secondary flex-1 md:flex-none"><PencilIcon className="w-5 h-5" /> Edit</button>
        {user.status === 'pending' && (
          <button onClick={() => approveUser(user.id)} className="btn-primary flex-1 md:flex-none">Approve</button>
        )}
        {user.status !== 'removed' && user.id !== profile.id && (
          <button
            onClick={() => removeUser(user.id, user.email)}
            disabled={isLastActiveAdmin(user.id)}
            className="btn-secondary flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 md:flex-none"
            title={isLastActiveAdmin(user.id) ? 'Cannot remove the last active admin' : ''}
          >
            <TrashIcon className="w-5 h-5" /> Remove
          </button>
        )}
      </>
    )
  );

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

      <label htmlFor="showRemoved" className="flex items-center gap-3 min-h-touch cursor-pointer">
        <input
          type="checkbox"
          id="showRemoved"
          checked={showRemoved}
          onChange={(e) => setShowRemoved(e.target.checked)}
          className="h-5 w-5 rounded"
        />
        <span className="text-sm text-gray-300">Show removed users</span>
      </label>

      {loading ? (
        <SkeletonList rows={5} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" message="No accounts match the current filter." />
      ) : (
        <>
          {/* Mobile: stacked cards (no horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((user) => (
              <DataCard
                key={user.id}
                title={user.email}
                fields={
                  editingId === user.id
                    ? [{ label: 'Role / Status', value: <div className="flex gap-2">{renderEditSelects(true)}</div> }]
                    : [
                        { label: 'Role', value: roleBadge(user.role) },
                        { label: 'Status', value: statusBadge(user.status) },
                        { label: 'Created', value: new Date(user.created_at).toLocaleDateString() },
                      ]
                }
                actions={renderActions(user)}
              />
            ))}
          </div>

          {/* Desktop: table (overflow-x-auto as a safety net) */}
          <div className="card hidden overflow-x-auto md:block">
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
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="select">
                          {roleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : roleBadge(user.role)}
                    </td>
                    <td className="p-3">
                      {editingId === user.id ? (
                        <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="select">
                          {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : statusBadge(user.status)}
                    </td>
                    <td className="p-3 text-sm text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">{renderActions(user)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Modal open={showTransferModal} onClose={() => setShowTransferModal(false)} title="Grant Admin Access">
        <p className="text-gray-400 mb-4">Select an approved user to grant admin privileges. Your admin access stays in place unless you choose to demote yourself.</p>

        <div className="space-y-4">
          <div>
            <label className="field-label">Target User</label>
            <select
              className="select"
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

          <label htmlFor="demoteSelf" className="flex items-center gap-3 min-h-touch cursor-pointer">
            <input
              type="checkbox"
              id="demoteSelf"
              checked={demoteSelf}
              onChange={(e) => setDemoteSelf(e.target.checked)}
              className="h-5 w-5 rounded"
            />
            <span className="text-sm text-gray-300">Demote myself to manager after granting access</span>
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={() => setShowTransferModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleTransferAdmin} className="btn-primary flex-1">Grant Admin</button>
        </div>
      </Modal>
    </div>
  );
}
