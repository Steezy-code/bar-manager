import { useState, useEffect } from 'react'
import { TrashIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'barmanager_timeoff'
const PENDING_KEY = 'barmanager_timeoff_pending'

export default function TimeOff() {
  const [approved, setApproved] = useState([])
  const [pending, setPending] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTimeOff, setNewTimeOff] = useState({ name: '', dates: '', days: '' })

  useEffect(() => {
    const savedApproved = localStorage.getItem(STORAGE_KEY)
    if (savedApproved) setApproved(JSON.parse(savedApproved))
    
    const savedPending = localStorage.getItem(PENDING_KEY)
    if (savedPending) setPending(JSON.parse(savedPending))
  }, [])

  const saveApproved = (newData) => {
    setApproved(newData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
  }

  const savePending = (newData) => {
    setPending(newData)
    localStorage.setItem(PENDING_KEY, JSON.stringify(newData))
  }

  const addPending = (e) => {
    e.preventDefault()
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const to = { ...newTimeOff, id: Date.now(), status: 'pending', month: currentMonth, year: currentYear }
    savePending([...pending, to])
    setShowAdd(false)
    setNewTimeOff({ name: '', dates: '', days: '' })
  }

  const approveRequest = (request) => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const approvedItem = { ...request, status: 'approved', month: currentMonth, year: currentYear }
    saveApproved([...approved, approvedItem])
    savePending(pending.filter(p => p.id !== request.id))
  }

  const denyRequest = (id) => {
    if (confirm('Deny this time off request?')) {
      savePending(pending.filter(p => p.id !== id))
    }
  }

  const removeApproved = (id) => saveApproved(approved.filter(t => t.id !== id))

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