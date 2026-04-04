import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Admin() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const roleOptions = ['admin', 'manager', 'staff', 'viewer'];
  const statusOptions = ['pending', 'approved', 'rejected'];

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

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ role: editRole, status: editStatus })
      .eq('id', editingId);
    if (error) {
      alert('Failed to update user: ' + error.message);
    } else {
      // Update local state
      setUsers(users.map(u => u.id === editingId ? { ...u, role: editRole, status: editStatus } : u));
      setEditingId(null);
    }
  };

  const approveUser = async (userId) => {
    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ status: 'approved' })
      .eq('id', userId);
    if (error) {
      alert('Failed to approve user: ' + error.message);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button onClick={fetchUsers} className="btn-secondary">Refresh</button>
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
              {users.map((user) => (
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
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}