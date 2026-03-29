import { useState, useEffect, useRef } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'barmanager_schedule'
const TIME_OFF_KEY = 'barmanager_timeoff'

export default function Schedule() {
  const [view, setView] = useState('week')
  const [shifts, setShifts] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [showAddShift, setShowAddShift] = useState(false)
  const [newShift, setNewShift] = useState({ name: '', day: 'Mon', start: '16:00', end: '23:00' })
  const csvRef = useRef(null)

  useEffect(() => {
    const savedShifts = localStorage.getItem(STORAGE_KEY)
    if (savedShifts) setShifts(JSON.parse(savedShifts))
    
    const savedTimeOff = localStorage.getItem(TIME_OFF_KEY)
    if (savedTimeOff) setTimeOff(JSON.parse(savedTimeOff))
  }, [])

  const saveShifts = (newShifts) => {
    setShifts(newShifts)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShifts))
  }

  const addShift = (e) => {
    e.preventDefault()
    saveShifts([...shifts, { ...newShift, id: Date.now() }])
    setShowAddShift(false)
    setNewShift({ name: '', day: 'Mon', start: '16:00', end: '23:00' })
  }

  const importCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(l => l.trim())
      
      const newShifts = []
      lines.forEach((line, i) => {
        if (i === 0) return
        const [name, day, start, end] = line.split(',').map(s => s.trim())
        if (name && day) {
          newShifts.push({ name, day, start: start || '16:00', end: end || '23:00', id: Date.now() + i })
        }
      })
      
      saveShifts([...shifts, ...newShifts])
      alert(`Imported ${newShifts.length} shifts!`)
    }
    reader.readAsText(file)
    csvRef.current.value = ''
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const monthDays = Array.from({ length: 30 }, (_, i) => i + 1)

  // Get data based on view
  const displayDays = view === 'week' ? days : monthDays

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex gap-2">
          <button onClick={() => csvRef.current.click()} className="btn-secondary text-sm">📊 Import CSV</button>
          <input type="file" accept=".csv" ref={csvRef} onChange={importCSV} className="hidden" />
          <button onClick={() => setView(view === 'week' ? 'month' : 'week')} className={`btn-primary ${view === 'week' ? 'bg-blue-600' : 'bg-bar-accent'}`}>
            {view === 'week' ? '📅 Switch to Month' : '📅 Switch to Week'}
          </button>
          <button onClick={() => setShowAddShift(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Add Shift
          </button>
        </div>
      </div>

      {timeOff.length > 0 && (
        <div className="card bg-yellow-500/20 border border-yellow-500">
          <h3 className="text-yellow-400 font-bold mb-2">📅 Time Off Scheduled</h3>
          <div className="flex flex-wrap gap-2">
            {timeOff.map((to, i) => (
              <span key={i} className="bg-yellow-600 px-2 py-1 rounded text-sm">{to.name}: {to.dates}</span>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-2 ${view === 'week' ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {displayDays.map(d => (
          <div key={d}>
            <div className="text-center p-2 bg-bar-card rounded-t-lg font-semibold text-sm">
              {view === 'week' ? d : `Day ${d}`}
            </div>
            <div className="mt-2 min-h-[150px] bg-bar-blue/30 p-2 space-y-2">
              {shifts.filter(s => view === 'week' ? s.day === d : s.day === d.toString()).map(s => (
                <div key={s.id} className="bg-bar-card p-2 rounded text-xs">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-gray-400">{s.start} - {s.end}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAddShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={addShift} className="bg-bar-card p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Add Shift</h2>
            <input placeholder="Staff name" className="input" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} required />
            {view === 'week' ? (
              <select className="input" value={newShift.day} onChange={e => setNewShift({...newShift, day: e.target.value})}>
                {days.map(d => <option key={d}>{d}</option>)}
              </select>
            ) : (
              <input type="number" min="1" max="30" placeholder="Day of month" className="input" value={newShift.day} onChange={e => setNewShift({...newShift, day: e.target.value})} />
            )}
            <div className="flex gap-2">
              <input type="time" className="input" value={newShift.start} onChange={e => setNewShift({...newShift, start: e.target.value})} />
              <input type="time" className="input" value={newShift.end} onChange={e => setNewShift({...newShift, end: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddShift(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
