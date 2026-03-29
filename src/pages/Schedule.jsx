import { useState, useEffect, useRef } from 'react'
import { PlusIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'barmanager_schedule'
const TIME_OFF_KEY = 'barmanager_timeoff'

export default function Schedule() {
  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [showAddShift, setShowAddShift] = useState(false)
  const [showCopyWeek, setShowCopyWeek] = useState(false)
  const [copyToMonth, setCopyToMonth] = useState(0)
  const [newShift, setNewShift] = useState({ name: '', day: 1, start: '16:00', end: '23:00' })
  const csvRef = useRef(null)

  const printSchedule = () => {
    window.print()
  }

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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
    const shift = { ...newShift, month: currentMonth, year: currentYear, id: Date.now() }
    saveShifts([...shifts, shift])
    setShowAddShift(false)
    setNewShift({ name: '', day: 1, start: '16:00', end: '23:00' })
  }

  const deleteShift = (id) => {
    if (confirm('Delete this shift?')) {
      saveShifts(shifts.filter(s => s.id !== id))
    }
  }

  const clearAll = () => {
    if (confirm('Clear ALL shifts? This cannot be undone!')) {
      saveShifts([])
    }
  }

  const exportCSV = () => {
    const data = shifts.map(s => `${s.name},${s.day},${s.start},${s.end}`)
    const csv = "Name,Day,Start,End\n" + data.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schedule-${currentYear}-${currentMonth + 1}.csv`
    a.click()
  }

  const handleCopyWeek = () => {
    const weekShifts = shifts.filter(s => s.month === currentMonth && s.year === currentYear)
    if (weekShifts.length === 0) {
      alert('No shifts to copy from this month!')
      return
    }
    
    // Copy only to the selected month
    let added = 0
    weekShifts.forEach(shift => {
      const newShift = { ...shift, id: Date.now() + Math.random(), month: parseInt(copyToMonth) }
      saveShifts([...shifts, newShift])
      added++
    })
    
    setShowCopyWeek(false)
    alert(`Copied ${added} shifts to ${months[copyToMonth]}!`)
  }

  const importCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(l => l.trim())
      
      const dayMap = {Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6}
      const newShifts = []
      
      lines.forEach((line, i) => {
        if (i === 0) return
        const parts = line.split(',').map(s => s.trim())
        const name = parts[0]
        const dayRaw = parts[1]
        const start = parts[2] || '16:00'
        const end = parts[3] || '23:00'
        
        if (name) {
          let dayNum
          if (isNaN(dayRaw)) {
            const shortDay = dayRaw.substring(0, 3)
            dayNum = dayMap[shortDay] !== undefined ? dayMap[shortDay] + 1 : 1
          } else {
            dayNum = parseInt(dayRaw)
          }
          
          newShifts.push({ name, day: dayNum, start, end, month: currentMonth, year: currentYear, id: Date.now() + i })
        }
      })
      
      saveShifts([...shifts, ...newShifts])
      alert(`Imported ${newShifts.length} shifts!`)
    }
    reader.readAsText(file)
    csvRef.current.value = ''
  }

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth }
  }

  const { firstDay, daysInMonth } = getMonthDays()
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex gap-2 flex-wrap print:hidden">
          <button onClick={() => csvRef.current.click()} className="btn-secondary text-sm">📥 Import</button>
          <button onClick={exportCSV} className="btn-secondary text-sm">📤 Export</button>
          <button onClick={() => setShowCopyWeek(true)} className="btn-secondary text-sm">📋 Copy Week</button>
          <button onClick={clearAll} className="btn-secondary text-sm text-red-400">🗑️ Clear</button>
          <button onClick={printSchedule} className="btn-secondary text-sm">🖨️ Print</button>
          <button onClick={() => setView(view === 'week' ? 'month' : 'week')} className="btn-primary">
            {view === 'week' ? '📅 Month' : '📅 Week'}
          </button>
          <button onClick={() => setShowAddShift(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
      <input type="file" accept=".csv" ref={csvRef} onChange={importCSV} className="hidden" />

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

      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 bg-bar-card rounded-lg"><ChevronLeftIcon className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 bg-bar-card rounded-lg"><ChevronRightIcon className="w-5 h-5" /></button>
      </div>

      {view === 'week' ? (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d, idx) => (
            <div key={d}>
              <div className="text-center p-2 bg-bar-card rounded-t-lg font-semibold">{d}</div>
              <div className="mt-2 min-h-[150px] bg-bar-blue/30 p-2 space-y-2">
                {shifts.filter(s => s.day === idx + 1 && s.month === currentMonth && s.year === currentYear).map(s => (
                  <div key={s.id} className="bg-bar-card p-2 rounded text-xs relative group">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-gray-400">{s.start} - {s.end}</div>
                    <button onClick={() => deleteShift(s.id)} className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100">
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 text-sm">
          {weekDays.map(d => (
            <div key={d} className="text-center p-1 bg-bar-card font-bold">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-bar-dark/50 p-2 min-h-[80px]"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            return (
              <div key={dayNum} className="bg-bar-blue/20 p-1 min-h-[80px]">
                <div className="text-sm font-bold text-center">{dayNum}</div>
                {shifts.filter(s => s.day === dayNum && s.month === currentMonth && s.year === currentYear).map(s => (
                  <div key={s.id} className="bg-bar-card p-1 rounded text-xs mt-1 relative group">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-gray-400 text-xs">{s.start}-{s.end}</div>
                    <button onClick={() => deleteShift(s.id)} className="absolute top-0 right-0 text-red-500 opacity-0 group-hover:opacity-100 bg-bar-card rounded">
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Copy Week Modal */}
      {showCopyWeek && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">📋 Copy Week to Another Month</h2>
            <p className="text-gray-400 mb-4">Which month do you want to copy this week's schedule to?</p>
            <select 
              className="input mb-4" 
              value={copyToMonth} 
              onChange={e => setCopyToMonth(e.target.value)}
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m} {currentYear}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowCopyWeek(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCopyWeek} className="btn-primary flex-1">Copy to {months[copyToMonth]}</button>
            </div>
          </div>
        </div>
      )}

      {showAddShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={addShift} className="bg-bar-card p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Add Shift for {monthName}</h2>
            <input placeholder="Staff name" className="input" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} required />
            <input type="number" min="1" max={daysInMonth} placeholder={`Day (1-${daysInMonth})`} className="input" value={newShift.day} onChange={e => setNewShift({...newShift, day: +e.target.value})} />
            <div className="flex gap-2">
              <input type="time" className="input" value={newShift.start} onChange={e => setNewShift({...newShift, start: e.target.value})} />
              <input type="time" className="input" value={newShift.end} onChange={e => setNewShift({...newShift, end: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddShift(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add Shift</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
