import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Settings() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState('staff')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get current user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, approved')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setCurrentUserRole(profile.role || 'staff')
        }
      }
      
      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at')
      
      if (profilesError) {
        console.error('Profiles error:', profilesError)
        setError('Could not load profiles. Make sure the database is set up correctly.')
      } else {
        setProfiles(profilesData || [])
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (id, role) => {
    try {
      await supabase.from('profiles').update({ role }).eq('id', id)
      loadData()
    } catch (err) {
      alert('Error updating role: ' + err.message)
    }
  }

  const approveUser = async (id) => {
    try {
      await supabase.from('profiles').update({ approved: true }).eq('id', id)
      loadData()
    } catch (err) {
      alert('Error approving user: ' + err.message)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to remove this user?')) return
    try {
      await supabase.from('profiles').delete().eq('id', id)
      loadData()
    } catch (err) {
      alert('Error deleting user: ' + err.message)
    }
  }

  if (loading) return <div className="text-center py-20">Loading settings...</div>

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-400">Manage your team</p>
        </div>
        <div className="card bg-red-500/20 border border-red-500">
          <p className="text-red-400">{error}</p>
          <button onClick={loadData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    )
  }

  const isManager = currentUserRole === 'manager'
  const pendingUsers = profiles.filter(p => !p.approved)
  const approvedUsers = profiles.filter(p => p.approved)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400">Manage your team • Your role: {currentUserRole}</p>
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
        <h2 className="text-lg font-semibold mb-4">Team Members ({approvedUsers.length})</h2>
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
                    <select value={profile.role || 'staff'} onChange={(e) => updateRole(profile.id, e.target.value)}
                      className="bg-bar-card border border-bar-blue rounded-lg px-3 py-1 text-sm">
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                    <button onClick={() => deleteUser(profile.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm capitalize">{profile.role || 'staff'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {approvedUsers.length === 0 && <p className="text-gray-400 text-center py-4">No approved team members yet.</p>}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">About BarManager</h2>
        <div className="text-gray-400 space-y-2">
          <p>Version 1.3.1</p>
        </div>
      </div>
    </div>
  )
}
