import { useState, useEffect, useRef } from 'react'
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'barmanager_schedule'
const TIME_OFF_KEY = 'barmanager_timeoff'

export default function Schedule() {
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [showAddShift, setShowAddShift] = useState(false)
  const [newShift, setNewShift] = useState({ name: '', day: 1, start: '16:00', end: '23:00' })
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
    setNewShift({ name: '', day: currentDate.getDate(), start: '16:00', end: '23:00' })
  }

  const importCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(l => l.trim())
      
      const newShifts = []
      const dayMap = {Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6}
      lines.forEach((line, i) => {
        if (i === 0) return
        const [name, day, start, end] = line.split(',').map(s => s.trim())
        if (name && day) {
          let dayNum = day
          if (isNaN(day)) {
            dayNum = dayMap[day.substring(0,3)] + 1
          }
          newShifts.push({ name, day: dayNum, start: start || '16:00', end: end || '23:00', id: Date.now() + i })
        }
      })
      
      saveShifts([...shifts, ...newShifts])
      alert(`Imported ${newShifts.length} shifts!`)
    }
    reader.readAsText(file)
    csvRef.current.value = ''
  }

  const getWeekDays = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth, year, month }
  }

  const { firstDay, daysInMonth, year, month } = getMonthDays()
  const weekDays = getWeekDays()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))

  const handleViewChange = (newView) => {
    setView(newView)
    if (newView === 'month') {
      setCurrentDate(new Date())
    }
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex gap-2">
          <button onClick={() => csvRef.current.click()} className="btn-secondary text-sm">📊 Import CSV</button>
          <input type="file" accept=".csv" ref={csvRef} onChange={importCSV} className="hidden" />
          <button onClick={() => handleViewChange(view === 'week' ? 'month' : 'week')} className={`btn-primary ${view === 'week' ? 'bg-blue-600' : 'bg-bar-accent'}`}>
            {view === 'week' ? '📅 Month View' : '📅 Week View'}
          </button>
          <button onClick={() => setShowAddShift(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Add Shift
          </button>
        </div>
      </div>

      {timeOff.length > 0 && (
        <div className="card bg-yellow-500/20 border border-yellow-500">
          <h3 className="text-yellow-400 font-bold mb-2">📅 Time Off</h3>
          <div className="flex flex-wrap gap-2">
            {timeOff.map((to, i) => (
              <span key={i} className="bg-yellow-600 px-2 py-1 rounded text-sm">{to.name}: {to.dates}</span>
            ))}
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={prevMonth} className="p-2 bg-bar-card rounded-lg"><ChevronLeftIcon className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold">{monthName}</h2>
          <button onClick={nextMonth} className="p-2 bg-bar-card rounded-lg"><ChevronRightIcon className="w-5 h-5" /></button>
        </div>
      )}

      {view === 'week' ? (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(d => (
            <div key={d}>
              <div className="text-center p-2 bg-bar-card rounded-t-lg font-semibold">{d}</div>
              <div className="mt-2 min-h-[150px] bg-bar-blue/30 p-2 space-y-2">
                {shifts.filter(s => {
                  const dayMap = {Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6}
                  return s.day === dayMap[d]
                }).map(s => (
                  <div key={s.id} className="bg-bar-card p-2 rounded text-xs">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-gray-400">{s.start} - {s.end}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => (
            <div key={d} className="text-center p-2 bg-bar-card font-semibold text-sm">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-bar-dark/50 p-2 min-h-[80px]"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            return (
              <div key={dayNum} className="bg-bar-blue/30 p-1 min-h-[80px]">
                <div className="text-sm font-bold text-center">{dayNum}</div>
                {shifts.filter(s => s.day === dayNum).map(s => (
                  <div key={s.id} className="bg-bar-card p-1 rounded text-xs mt-1">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-gray-400 text-xs">{s.start}-{s.end}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {showAddShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={addShift} className="bg-bar-card p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Add Shift</h2>
            <input placeholder="Staff name" className="input" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} required />
            {view === 'week' ? (
              <select className="input" value={newShift.day} onChange={e => {
                const dayMap = {Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6}
                setNewShift({...newShift, day: dayMap[e.target.value]})
              }}>
                {weekDays.map(d => <option key={d}>{d}</option>)}
              </select>
            ) : (
              <input type="number" min="1" max={daysInMonth} placeholder={`Day (1-${daysInMonth})`} className="input" value={newShift.day} onChange={e => setNewShift({...newShift, day: +e.target.value})} />
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
