import { useEffect, useState } from 'react'
import { supabase, TABLES } from '../lib/supabase'
import { TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline'

export default function Settings() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .order('created_at')
      
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
      await supabase
        .from(TABLES.PROFILES)
        .update({ role })
        .eq('id', id)
      
      loadProfiles()
    } catch (err) {
      alert('Error updating role: ' + err.message)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to remove this user?')) return
    
    try {
      await supabase
        .from(TABLES.PROFILES)
        .delete()
        .eq('id', id)
      
      loadProfiles()
    } catch (err) {
      alert('Error deleting user: ' + err.message)
    }
  }

  if (loading) return <div className="text-center py-20">Loading settings...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400">Manage your team and preferences</p>
      </div>

      {/* Team Management */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Team Members</h2>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn-primary flex items-center gap-2"
          >
            <UserPlusIcon className="w-5 h-5" />
            Add Member
          </button>
        </div>

        <div className="space-y-3">
          {profiles.map(profile => (
            <div key={profile.id} className="flex items-center justify-between p-3 bg-bar-blue rounded-lg">
              <div>
                <div className="font-semibold">{profile.full_name || 'Unnamed User'}</div>
                <div className="text-sm text-gray-400">{profile.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={profile.role}
                  onChange={(e) => updateRole(profile.id, e.target.value)}
                  className="bg-bar-card border border-bar-blue rounded-lg px-3 py-1 text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
                <button
                  onClick={() => deleteUser(profile.id)}
                  className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {profiles.length === 0 && (
          <p className="text-gray-400 text-center py-4">
            No team members yet. Add some to get started!
          </p>
        )}
      </div>

      {/* App Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">About BarManager</h2>
        <div className="text-gray-400 space-y-2">
          <p>Version 1.0.0</p>
          <p>Built with React + Supabase + Netlify</p>
          <p className="text-sm">
            A free, open-source restaurant management tool.
            <br />
            Deploy your own at no cost!
          </p>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Team Member</h2>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                To add a new team member, have them create an account at the login page,
                then you can update their role here.
              </p>
              <p className="text-gray-400 text-sm">
                New users will appear in this list after signing up.
              </p>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
