import { useState, useEffect, useCallback } from 'react'
import { TrashIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function TimeOff() {
  const { user } = useAuth()
  const [approved, setApproved] = useState([])
  const [pending, setPending] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTimeOff, setNewTimeOff] = useState(() => ({ name: '', dates: '', days: '', month: new Date().getMonth(), year: new Date().getFullYear() }))
  const [loading, setLoading] = useState(true)

  // Fetch time off requests from Supabase
  const fetchTimeOff = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.TIME_OFF)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error

      const pendingData = data.filter(r => r.status === 'pending')
      const approvedData = data.filter(r => r.status === 'approved')
      setPending(pendingData)
      setApproved(approvedData)
    } catch (err) {
      console.error('Error fetching time off requests:', err)
      alert('Failed to load time off requests from database.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTimeOff()
  }, [fetchTimeOff])

  // Add new pending request
  const addPending = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('You must be logged in to add a request.')
      return
    }

    const requestToInsert = {
      name: newTimeOff.name,
      dates: newTimeOff.dates,
      days: newTimeOff.days,
      status: 'pending',
      month: newTimeOff.month,
      year: newTimeOff.year,
      user_id: user.id
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.TIME_OFF)
        .insert([requestToInsert])
        .select('*')
      if (error) throw error

      const inserted = data[0]
      setPending([...pending, inserted])
      setShowAdd(false)
      setNewTimeOff({ name: '', dates: '', days: '' })
    } catch (err) {
      console.error('Error adding time off request:', err)
      alert('Failed to add request to database.')
    }
  }

  // Approve request
  const approveRequest = async (request) => {
    try {
      const { error } = await supabase
        .from(TABLES.TIME_OFF)
        .update({ status: 'approved' })
        .eq('id', request.id)
      if (error) throw error

      // Move from pending to approved in state
      setPending(pending.filter(p => p.id !== request.id))
      setApproved([...approved, { ...request, status: 'approved' }])
    } catch (err) {
      console.error('Error approving request:', err)
      alert('Failed to approve request in database.')
    }
  }

  // Deny request (delete)
  const denyRequest = async (id) => {
    if (!confirm('Deny this time off request?')) return

    try {
      const { error } = await supabase
        .from(TABLES.TIME_OFF)
        .delete()
        .eq('id', id)
      if (error) throw error

      setPending(pending.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error denying request:', err)
      alert('Failed to deny request in database.')
    }
  }

  // Remove approved request (delete)
  const removeApproved = async (id) => {
    if (!confirm('Remove this approved time off?')) return

    try {
      const { error } = await supabase
        .from(TABLES.TIME_OFF)
        .delete()
        .eq('id', id)
      if (error) throw error

      setApproved(approved.filter(t => t.id !== id))
    } catch (err) {
      console.error('Error removing approved request:', err)
      alert('Failed to remove request from database.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <div className="flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">Time Off</h1>
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        </div>
        <div className="card">
          <div className="text-gray-400">Loading time off requests...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Time Off</h1>
          <p className="text-gray-400 text-sm">Review requests → Approve to add to schedule</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add Request
        </button>
      </div>

      {pending.length > 0 && (
        <div className="card bg-yellow-500/20 border border-yellow-500">
          <h2 className="text-lg font-bold mb-4 text-yellow-400">Pending Requests ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-bar-card rounded-lg border border-yellow-500">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.dates} (Days: {t.days})</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveRequest(t)} className="p-2 bg-green-600 rounded text-white hover:bg-green-500">
                    <CheckIcon className="w-5 h-5" /> Approve
                  </button>
                  <button onClick={() => denyRequest(t.id)} className="p-2 bg-red-600 rounded text-white hover:bg-red-500">
                    <XMarkIcon className="w-5 h-5" /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Approved ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="text-gray-400">No time off scheduled yet</p>
        ) : (
          <div className="space-y-3">
            {approved.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-bar-blue rounded-lg">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.dates} (Days: {t.days})</div>
                </div>
                <button onClick={() => removeApproved(t.id)} className="p-2 text-red-500">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={addPending} className="bg-bar-card p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Add Time Off Request</h2>
            <input placeholder="Staff name" className="input" value={newTimeOff.name} onChange={e => setNewTimeOff({...newTimeOff, name: e.target.value})} required />
            <input placeholder="Dates (e.g., March 15-17)" className="input" value={newTimeOff.dates} onChange={e => setNewTimeOff({...newTimeOff, dates: e.target.value})} required />
            <input placeholder="Day numbers (e.g., 15,16,17)" className="input" value={newTimeOff.days} onChange={e => setNewTimeOff({...newTimeOff, days: e.target.value})} required />
            <div className="flex gap-2">
              <select className="input flex-1" value={newTimeOff.month + 1} onChange={e => setNewTimeOff({...newTimeOff, month: parseInt(e.target.value) - 1})}>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
              <select className="input flex-1" value={newTimeOff.year} onChange={e => setNewTimeOff({...newTimeOff, year: parseInt(e.target.value)})}>
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
            <p className="text-gray-400 text-xs">Request goes to queue. Click Approve to add to schedule.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add to Queue</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}