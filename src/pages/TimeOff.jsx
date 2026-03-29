import { useState, useEffect } from 'react'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'barmanager_timeoff'

export default function TimeOff() {
  const [timeOff, setTimeOff] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTimeOff, setNewTimeOff] = useState({ name: '', dates: '', days: [] })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setTimeOff(JSON.parse(saved))
  }, [])

  const save = (newData) => {
    setTimeOff(newData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
  }

  const addTimeOff = (e) => {
    e.preventDefault()
    // Convert dates to day abbreviations (Mon, Tue, etc.)
    const days = extractDaysFromDates(newTimeOff.dates)
    const to = { ...newTimeOff, days, id: Date.now() }
    save([...timeOff, to])
    setShowAdd(false)
    setNewTimeOff({ name: '', dates: '', days: [] })
  }

  const extractDaysFromDates = (dateRange) => {
    // Simple extraction - manager can manually add days
    // For now, return empty and manager can manually add
    return []
  }

  const remove = (id) => save(timeOff.filter(t => t.id !== id))

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Time Off</h1>
          <p className="text-gray-400 text-sm">Manager adds approved time off - shows on schedule</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add Approved
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Approved Time Off ({timeOff.length})</h2>
        {timeOff.length === 0 ? (
          <p className="text-gray-400">No time off scheduled yet</p>
        ) : (
          <div className="space-y-3">
            {timeOff.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-bar-blue rounded-lg">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.dates}</div>
                </div>
                <button onClick={() => remove(t.id)} className="p-2 text-red-500">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card bg-blue-500/20 border border-blue-500">
        <h3 className="text-blue-400 font-bold">💡 How It Works</h3>
        <ul className="text-gray-300 text-sm mt-2 space-y-1">
          <li>• Add approved time off here</li>
          <li>• It automatically shows on the Schedule page</li>
          <li>• Export includes time off data</li>
          <li>• Send to staff so they know who's out when</li>
        </ul>
      </div>

      {/* Add Time Off Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={addTimeOff} className="bg-bar-card p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Add Time Off</h2>
            <input placeholder="Staff name" className="input" value={newTimeOff.name} onChange={e => setNewTimeOff({...newTimeOff, name: e.target.value})} required />
            <input placeholder="Dates (e.g., March 15-17)" className="input" value={newTimeOff.dates} onChange={e => setNewTimeOff({...newTimeOff, dates: e.target.value})} required />
            <p className="text-gray-400 text-xs">Enter the date range - it will show on schedule</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
