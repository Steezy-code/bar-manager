import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Settings({ currentUser }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState('staff')

  useEffect(() => {
    loadProfiles()
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile) setCurrentUserRole(profile.role)
      }
    } catch (err) {
      console.error('Error checking role:', err)
    }
  }

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at')
      if (error) throw error
      setProfiles(data || [])
    } catch (err) {
      console.error('Error loading profiles:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (id, role) => {
    try {
      await supabase.from('profiles').update({ role }).eq('id', id)
      loadProfiles()
    } catch (err) {
      alert('Error updating role: ' + err.message)
    }
  }

  const approveUser = async (id) => {
    try {
      await supabase.from('profiles').update({ approved: true }).eq('id', id)
      loadProfiles()
    } catch (err) {
      alert('Error approving user: ' + err.message)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to remove this user?')) return
    try {
      await supabase.from('profiles').delete().eq('id', id)
      loadProfiles()
    } catch (err) {
      alert('Error deleting user: ' + err.message)
    }
  }

  if (loading) return <div className="text-center py-20">Loading settings...</div>

  const isManager = currentUserRole === 'manager'
  const pendingUsers = profiles.filter(p => !p.approved)
  const approvedUsers = profiles.filter(p => p.approved)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400">Manage your team and preferences</p>
      </div>

      {isManager && pendingUsers.length > 0 && (
        <div className="card border-yellow-500/50">
          <h2 className="text-lg font-semibold mb-4 text-yellow-500">⏳ Pending Approvals ({pendingUsers.length})</h2>
          <div className="space-y-3">
            {pendingUsers.map(profile => (
              <div key={profile.id} className="flex items-center justify-between p-3 bg-bar-blue rounded-lg">
                <div>
                  <div className="font-semibold">{profile.full_name || 'Unnamed User'}</div>
                  <div className="text-sm text-gray-400">{profile.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => approveUser(profile.id)} className="p-2 bg-green-600 rounded-lg flex items-center gap-1">
                    <CheckIcon className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => deleteUser(profile.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Team Members</h2>
        <div className="space-y-3">
          {approvedUsers.map(profile => (
            <div key={profile.id} className="flex items-center justify-between p-3 bg-bar-blue rounded-lg">
              <div>
                <div className="font-semibold">{profile.full_name || 'Unnamed User'}</div>
                <div className="text-sm text-gray-400">{profile.email}</div>
              </div>
              <div className="flex items-center gap-3">
                {isManager ? (
                  <>
                    <select value={profile.role} onChange={(e) => updateRole(profile.id, e.target.value)}
                      className="bg-bar-card border border-bar-blue rounded-lg px-3 py-1 text-sm">
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                    <button onClick={() => deleteUser(profile.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">{profile.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {approvedUsers.length === 0 && <p className="text-gray-400 text-center py-4">No team members yet.</p>}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">About BarManager</h2>
        <div className="text-gray-400 space-y-2">
          <p>Version 1.3.0</p>
          <p>Your role: {currentUserRole}</p>
        </div>
      </div>
    </div>
  )
}
