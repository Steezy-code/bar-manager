import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Format HH:MM to h:mm AM/PM
const formatTime12 = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// Get role color (default if role missing)
const getRoleColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'bartender': return 'bg-blue-500'
    case 'server': return 'bg-green-500'
    case 'cook': return 'bg-orange-500'
    case 'manager': return 'bg-purple-500'
    default: return 'bg-gray-500'
  }
}

const TIME_OFF_KEY = 'barmanager_timeoff'

// Helper to convert day/month/year to Supabase date string (YYYY-MM-DD)
const formatDateForSupabase = (year, month, day) => {
  const monthStr = month < 10 ? `0${month}` : month
  const dayStr = day < 10 ? `0${day}` : day
  return `${year}-${monthStr}-${dayStr}`
}

// Helper to parse Supabase date string to day/month/year
const parseSupabaseDate = (dateStr) => {
  const date = new Date(dateStr)
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // getMonth is 0-indexed, UI uses 1-indexed
    day: date.getDate()
  }
}

export default function Schedule() {
  const { user, profile } = useAuth()
  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [showAddShift, setShowAddShift] = useState(false)
  const [showCopyWeek, setShowCopyWeek] = useState(false)
  const [copyToMonth, setCopyToMonth] = useState(0)
  const [newShift, setNewShift] = useState({ name: '', day: 1, start: '16:00', end: '23:00' })
  const [loading, setLoading] = useState(true)
  const csvRef = useRef(null)

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Fetch shifts from Supabase
  const fetchShifts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.SHIFTS)
        .select('*')
        .order('date', { ascending: true })
      
      if (error) throw error

      // Map Supabase rows to UI shape
      const mapped = data.map(shift => ({
        id: shift.id,
        name: shift.staff_name || 'Shift',
        role: shift.role,
        ...parseSupabaseDate(shift.date),
        start: shift.start_time,
        end: shift.end_time,
        // Keep month/year as numbers for filtering (UI uses zero-indexed month)
        month: new Date(shift.date).getMonth(),
        year: new Date(shift.date).getFullYear()
      }))
      setShifts(mapped)
    } catch (err) {
      console.error('Error fetching shifts:', err)
      alert('Failed to load schedule from database.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch time off from localStorage (still local for now)
  useEffect(() => {
    const savedTimeOff = localStorage.getItem(TIME_OFF_KEY)
    if (savedTimeOff) setTimeOff(JSON.parse(savedTimeOff))
    fetchShifts()
  }, [fetchShifts])

  // Add Shift to Supabase
  const addShift = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('You must be logged in to add a shift.')
      return
    }

    const shiftDate = formatDateForSupabase(currentYear, currentMonth + 1, newShift.day) // currentMonth is zero-indexed, need +1 for date
    const shiftToInsert = {
      staff_name: newShift.name,
      date: shiftDate,
      start_time: newShift.start,
      end_time: newShift.end,
      user_id: user.id, // optional for phase 1, but we have user
      role: profile?.role || 'staff'
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.SHIFTS)
        .insert([shiftToInsert])
        .select('*')

      if (error) throw error

      const inserted = data[0]
      const uiShift = {
        id: inserted.id,
        name: inserted.staff_name,
        role: inserted.role,
        ...parseSupabaseDate(inserted.date),
        start: inserted.start_time,
        end: inserted.end_time,
        month: new Date(inserted.date).getMonth(),
        year: new Date(inserted.date).getFullYear()
      }
      setShifts(prev => [...prev, uiShift])
      setShowAddShift(false)
      setNewShift({ name: '', day: 1, start: '16:00', end: '23:00' })
    } catch (err) {
      console.error('Error adding shift:', err)
      alert('Failed to add shift to database.')
    }
  }

  // Delete Shift from Supabase
  const deleteShift = async (id) => {
    if (!confirm('Delete this shift?')) return

    try {
      const { error } = await supabase
        .from(TABLES.SHIFTS)
        .delete()
        .eq('id', id)
      if (error) throw error

      setShifts(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Error deleting shift:', err)
      alert('Failed to delete shift from database.')
    }
  }

  const printSchedule = () => {
    document.body.classList.add('printing')
    window.print()
    document.body.classList.remove('printing')
  }

  const getTimeOffDays = (dayNum) => {
    if (!timeOff.length) return []
    return timeOff.filter(to => {
      if (!to.days) return false
      if (to.year !== currentYear || to.month !== currentMonth) return false
      const days = String(to.days).split(',').map(d => parseInt(d.trim()))
      return days.includes(dayNum)
    })
  }

  const clearAll = () => {
    if (confirm('Clear ALL shifts and time off? This cannot be undone!')) {
      // For phase 1, we won't implement bulk delete from Supabase
      // Instead, we'll just clear local state and localStorage for timeOff
      setShifts([])
      setTimeOff([])
      localStorage.removeItem(TIME_OFF_KEY)
      alert('Shifts cleared locally. Supabase data unchanged.')
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
      // Note: This will add to local state only, not to Supabase
      // For phase 1, we'll keep copy week as local-only to keep it simple
      setShifts(prev => [...prev, newShift])
      added++
    })
    
    setShowCopyWeek(false)
    alert(`Copied ${added} shifts to ${months[copyToMonth]} (local only).`)
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
      
      // For phase 1, CSV import will be local only
      setShifts(prev => [...prev, ...newShifts])
      alert(`Imported ${newShifts.length} shifts (local only).`)
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
  const goToday = () => setCurrentDate(new Date())

  // Build list of days to show based on current view (week/month)
  const getDaysToShow = () => {
    const days = []
    if (view === 'week') {
      // Start of week (Sunday)
      const start = new Date(currentDate)
      start.setDate(start.getDate() - start.getDay())
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(start)
        dayDate.setDate(start.getDate() + i)
        const year = dayDate.getFullYear()
        const month = dayDate.getMonth()
        const day = dayDate.getDate()
        const dayShifts = shifts.filter(s => s.year === year && s.month === month && s.day === day)
        const dayTimeOff = timeOff.filter(to => 
          to.year === year && 
          to.month === month && 
          to.days && 
          String(to.days).split(',').map(d => parseInt(d.trim())).includes(day)
        )
        days.push({ date: dayDate, shifts: dayShifts, timeOff: dayTimeOff })
      }
    } else {
      // Month view – all days of the current month
      for (let i = 1; i <= daysInMonth; i++) {
        const year = currentYear
        const month = currentMonth
        const day = i
        const dayShifts = shifts.filter(s => s.year === year && s.month === month && s.day === day)
        const dayTimeOff = timeOff.filter(to => 
          to.year === year && 
          to.month === month && 
          to.days && 
          String(to.days).split(',').map(d => parseInt(d.trim())).includes(day)
        )
        days.push({ date: new Date(year, month, day), shifts: dayShifts, timeOff: dayTimeOff })
      }
    }
    return days
  }

  const formatDayHeader = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Schedule</h1>
          <div className="flex gap-2 flex-wrap print:hidden">
            <div className="h-10 w-20 bg-bar-card rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-bar-card rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-bar-card rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="h-10 w-10 bg-bar-card rounded animate-pulse"></div>
          <div className="h-10 w-40 bg-bar-card rounded animate-pulse"></div>
          <div className="h-10 w-10 bg-bar-card rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 bg-bar-card rounded animate-pulse"></div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-bar-card rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

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

      

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button onClick={prevMonth} className="p-2 bg-bar-card rounded-lg hover:bg-bar-blue transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
        <button onClick={goToday} className="px-3 py-2 bg-bar-accent rounded-lg text-sm font-semibold hover:bg-bar-accent/80 transition-colors">Today</button>
        <h2 className="text-xl font-bold min-w-[200px] text-center">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 bg-bar-card rounded-lg hover:bg-bar-blue transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
      </div>

      {view === 'week' ? (
        <div className="overflow-x-auto pb-2">
          {shifts.filter(s => s.month === currentMonth && s.year === currentYear).length === 0 ? (
            <div className="text-center py-8 text-gray-400 min-w-[300px]">No shifts scheduled this week. Add one!</div>
          ) : (
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {weekDays.map((d, idx) => (
                <div key={d}>
                  <div className="text-center p-2 bg-bar-card rounded-t-lg font-semibold">{d}</div>
                  <div className="mt-2 min-h-[150px] bg-bar-blue/30 p-2 space-y-2">
                    {shifts.filter(s => s.day === idx + 1 && s.month === currentMonth && s.year === currentYear).map(s => (
                      <div key={s.id} className="bg-bar-card p-2 rounded text-xs relative group hover:bg-bar-blue transition-colors">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-gray-400">{formatTime12(s.start)} – {formatTime12(s.end)}</div>
                        <button onClick={() => deleteShift(s.id)} className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 bg-bar-card rounded p-1">
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Mobile list view (vertical) */}
          <div className="block md:hidden space-y-4">
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dayShifts = shifts.filter(s => s.day === dayNum && s.month === currentMonth && s.year === currentYear)
              const timeOffs = getTimeOffDays(dayNum)
              if (dayShifts.length === 0 && timeOffs.length === 0) return null // skip empty days
              return (
                <div key={dayNum} className="bg-bar-card p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">{dayNum} {weekDays[(firstDay + dayNum - 1) % 7]}</h3>
                    <span className="text-gray-400 text-sm">{monthName}</span>
                  </div>
                  {dayShifts.map(s => (
                    <div key={s.id} className="bg-bar-blue p-3 rounded mb-2 flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-gray-400 text-sm">{formatTime12(s.start)} – {formatTime12(s.end)}</div>
                      </div>
                      <button onClick={() => deleteShift(s.id)} className="text-red-500 hover:bg-red-500/20 p-2 rounded">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {timeOffs.map(to => (
                    <div key={to.id} className="bg-yellow-600 p-3 rounded mb-2">
                      <div className="font-semibold">OFF: {to.name}</div>
                      <div className="text-gray-200 text-sm">{to.dates}</div>
                    </div>
                  ))}
                </div>
              )
            })}
            {shifts.filter(s => s.month === currentMonth && s.year === currentYear).length === 0 && (
              <div className="text-center py-8 text-gray-400">No shifts scheduled this month. Add one!</div>
            )}
          </div>

          {/* Desktop grid view (7‑column) */}
          <div className="hidden md:grid grid-cols-7 gap-2 text-sm">
            {weekDays.map(d => (
              <div key={d} className="text-center p-2 bg-bar-card font-bold rounded-t-lg">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-bar-dark/50 p-2 min-h-[100px] rounded"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              return (
                <div key={dayNum} className="bg-bar-blue/20 p-2 min-h-[100px] rounded">
                  <div className="text-sm font-bold text-center mb-1">{dayNum}</div>
                  {shifts.filter(s => s.day === dayNum && s.month === currentMonth && s.year === currentYear).map(s => (
                    <div key={s.id} className="bg-bar-card p-2 rounded text-xs mt-1 relative group hover:bg-bar-blue transition-colors">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-gray-400 text-xs">{formatTime12(s.start)}–{formatTime12(s.end)}</div>
                      <button onClick={() => deleteShift(s.id)} className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 bg-bar-card rounded p-1">
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {getTimeOffDays(dayNum).map(to => (
                    <div key={to.id} className="bg-yellow-600 p-2 rounded text-xs mt-1">OFF: {to.name}</div>
                  ))}
                </div>
              )
            })}
          </div>
          {shifts.filter(s => s.month === currentMonth && s.year === currentYear).length === 0 && (
            <div className="hidden md:block text-center py-8 text-gray-400">No shifts scheduled this month. Add one!</div>
          )}
        </>
      )}

      {/* Copy Week Modal */}
      {showCopyWeek && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card p-4 md:p-6 rounded-none md:rounded-xl w-full max-w-full md:max-w-md mx-auto md:mx-0">
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
          <form onSubmit={addShift} className="bg-bar-card p-4 md:p-6 rounded-none md:rounded-xl w-full max-w-full md:max-w-md space-y-3 mx-auto md:mx-0">
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