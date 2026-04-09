import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

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
// Helper to convert year, zero‑indexed month (0–11), day (1–31) to Supabase date string (YYYY‑MM‑DD)
const formatDateForSupabase = (year, monthZeroIndexed, day) => {
  const month = monthZeroIndexed + 1; // convert to 1‑indexed for date string
  const monthStr = month < 10 ? `0${month}` : month;
  const dayStr = day < 10 ? `0${day}` : day;
  return `${year}-${monthStr}-${dayStr}`;
};

// Helper to parse Supabase date string (YYYY‑MM‑DD) to { year, month (0–11), day (1–31) }
const parseSupabaseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    year,
    month: month - 1, // convert 1‑indexed month to zero‑indexed
    day
  };
}

// Helper to convert weekday abbreviation (Sun, Mon, etc.) to day of month (1‑31) for given year/month
// Returns the first occurrence of that weekday in the month
const weekdayAbbrToDayOfMonth = (abbr, year, monthZeroIndexed) => {
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const targetDow = dayMap[abbr.substring(0, 3)];
  if (targetDow === undefined) return 1;
  // Find first day of month that matches target weekday
  for (let day = 1; day <= 7; day++) {
    const date = new Date(year, monthZeroIndexed, day);
    if (date.getDay() === targetDow) return day;
  }
  return 1; // fallback
};

// Parse day input (number or weekday abbreviation) to day of month (1‑31)
const parseDay = (dayRaw, year, monthZeroIndexed) => {
  if (!dayRaw) return 1;
  const num = parseInt(dayRaw, 10);
  if (!isNaN(num)) return Math.max(1, Math.min(num, 31));
  // treat as weekday abbreviation
  return weekdayAbbrToDayOfMonth(dayRaw, year, monthZeroIndexed);
};

export default function Schedule() {
  const { user, profile } = useAuth()
  const { hasRole } = usePermissions()
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
        end: shift.end_time
      }))
      setShifts(mapped)
    } catch (err) {
      console.error('Error fetching shifts:', err)
      alert('Failed to load schedule from database.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTimeOff = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.TIME_OFF)
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      
      if (error) throw error

      // Detect month indexing: if any month > 11, assume 1‑indexed (calendar months) and convert to zero‑indexed
      const hasOneIndexed = data && data.some(to => to.month > 11);
      const mapped = (data || []).map(to => ({
        ...to,
        month: hasOneIndexed ? to.month - 1 : to.month
      }));
      if (hasOneIndexed) {
        console.warn('Detected 1‑indexed months in time‑off requests; applying conversion. Run migration 20260408040000_fix_time_off_month_index.sql.');
      }
      setTimeOff(mapped)
    } catch (err) {
      console.error('Error fetching time off:', err)
      alert('Failed to load time off from database.')
    }
  }, [])

  // Fetch time off from Supabase (approved only)
  useEffect(() => {
    fetchShifts()
    fetchTimeOff()
  }, [fetchShifts, fetchTimeOff])

  // Add Shift to Supabase
  const addShift = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('You must be logged in to add a shift.')
      return
    }

    const shiftDate = formatDateForSupabase(currentYear, currentMonth, newShift.day) // month already zero-indexed
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
        end: inserted.end_time
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

  const clearAll = async () => {
    if (!confirm('Clear ALL shifts and time off? This cannot be undone!')) return;

    if (!hasRole('manager')) {
      alert('Only managers can clear shifts.');
      return;
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDate = formatDateForSupabase(currentYear, currentMonth, 1);
    const endDate = formatDateForSupabase(currentYear, currentMonth, daysInMonth);

    try {
      // Delete shifts for the month
      const { error: shiftError } = await supabase
        .from(TABLES.SHIFTS)
        .delete()
        .gte('date', startDate)
        .lte('date', endDate);

      if (shiftError) throw shiftError;

      // Delete approved time-off entries for the month
      const { error: timeOffError } = await supabase
        .from(TABLES.TIME_OFF)
        .delete()
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('status', 'approved');

      if (timeOffError) throw timeOffError;

      // Refresh UI
      await fetchShifts();
      await fetchTimeOff();

      alert(`Cleared all shifts and time‑off for ${months[currentMonth]} ${currentYear}.`);
    } catch (err) {
      console.error('Error clearing schedule:', err);
      alert('Failed to clear schedule. Check console for details.');
    }
  }

  const refreshSchedule = () => {
    fetchShifts()
    fetchTimeOff()
  }

  const exportCSV = () => {
    const header = "Name,Day,Start,End,Role,Month,Year";
    const data = shifts.map(s => {
      const month = s.month !== undefined ? s.month + 1 : currentMonth + 1;
      const year = s.year !== undefined ? s.year : currentYear;
      return `${s.name},${s.day},${s.start},${s.end},${s.role || ''},${month},${year}`;
    });
    const csv = header + "\n" + data.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
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

  const importCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        alert('CSV file is empty or has no data rows.');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim());
      const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name');
      const dayIdx = headers.findIndex(h => h.toLowerCase() === 'day');
      const startIdx = headers.findIndex(h => h.toLowerCase() === 'start');
      const endIdx = headers.findIndex(h => h.toLowerCase() === 'end');
      const roleIdx = headers.findIndex(h => h.toLowerCase() === 'role');
      const monthIdx = headers.findIndex(h => h.toLowerCase() === 'month');
      const yearIdx = headers.findIndex(h => h.toLowerCase() === 'year');

      if (nameIdx === -1 || dayIdx === -1) {
        alert('CSV must have at least "Name" and "Day" columns.');
        return;
      }

      const shiftsToInsert = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const name = parts[nameIdx];
        if (!name) continue; // skip empty rows

        const dayRaw = parts[dayIdx] || '1';
        const start = parts[startIdx] || '16:00';
        const end = parts[endIdx] || '23:00';
        const role = parts[roleIdx] || (profile?.role || 'staff');
        let month = currentMonth;
        let year = currentYear;

        if (monthIdx !== -1 && parts[monthIdx]) {
          const monthVal = parseInt(parts[monthIdx]);
          if (!isNaN(monthVal) && monthVal >= 1 && monthVal <= 12) {
            month = monthVal - 1; // convert to zero-indexed
          }
        }
        if (yearIdx !== -1 && parts[yearIdx]) {
          const yearVal = parseInt(parts[yearIdx]);
          if (!isNaN(yearVal) && yearVal >= 2000 && yearVal <= 2100) {
            year = yearVal;
          }
        }

        const day = parseDay(dayRaw, year, month);
        const dateStr = formatDateForSupabase(year, month, day);

        shiftsToInsert.push({
          staff_name: name,
          date: dateStr,
          start_time: start,
          end_time: end,
          role: role,
          user_id: user?.id,
        });
      }

      if (shiftsToInsert.length === 0) {
        alert('No valid shifts found in CSV.');
        return;
      }

      try {
        // Batch insert into Supabase
        const { data, error } = await supabase
          .from(TABLES.SHIFTS)
          .insert(shiftsToInsert)
          .select('*');

        if (error) throw error;

        // Refresh shifts from Supabase
        await fetchShifts();
        alert(`Successfully imported ${shiftsToInsert.length} shifts.`);
      } catch (err) {
        console.error('Error importing shifts:', err);
        alert('Failed to import shifts. Check console for details.');
      }
    };

    reader.readAsText(file);
    csvRef.current.value = '';
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
  const getDisplayDate = () => {
    if (view === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay()); // Sunday
      return start;
    }
    return currentDate;
  };
  const monthName = getDisplayDate().toLocaleString('default', { month: 'long', year: 'numeric' })

  const prevView = () => {
    if (view === 'week') {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))
    } else {
      setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
    }
  }
  const nextView = () => {
    if (view === 'week') {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))
    } else {
      setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))
    }
  }
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
          {hasRole('manager') && (
            <>
              <button onClick={() => csvRef.current.click()} className="btn-secondary text-sm">📥 Import</button>
              <button onClick={exportCSV} className="btn-secondary text-sm">📤 Export</button>
              <button onClick={() => setShowCopyWeek(true)} className="btn-secondary text-sm">📋 Copy Week</button>
              <button onClick={clearAll} className="btn-secondary text-sm text-red-400">🗑️ Clear</button>
            </>
          )}
          <button onClick={printSchedule} className="btn-secondary text-sm">🖨️ Print</button>
          <button onClick={refreshSchedule} className="btn-secondary text-sm">🔄 Refresh</button>
          <button onClick={() => setView(view === 'week' ? 'month' : 'week')} className="btn-primary">
            {view === 'week' ? '📅 Month' : '📅 Week'}
          </button>
          {hasRole('manager') && (
            <button onClick={() => setShowAddShift(true)} className="btn-primary">
              <PlusIcon className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>
      <input type="file" accept=".csv" ref={csvRef} onChange={importCSV} className="hidden" />

      

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button onClick={prevView} className="p-2 bg-bar-card rounded-lg hover:bg-bar-blue transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
        <button onClick={goToday} className="px-3 py-2 bg-bar-accent rounded-lg text-sm font-semibold hover:bg-bar-accent/80 transition-colors">Today</button>
        <h2 className="text-xl font-bold min-w-[200px] text-center">{monthName}</h2>
        <button onClick={nextView} className="p-2 bg-bar-card rounded-lg hover:bg-bar-blue transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
      </div>

      {view === 'week' ? (
        <div className="space-y-6">
          {/* Day‑stacked list for week view */}
          {(() => {
            const days = getDaysToShow()
            const anyShiftsOrTimeOff = days.some(day => day.shifts.length > 0 || day.timeOff.length > 0)
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {days.map(({ date, shifts: dayShifts, timeOff: dayTimeOff }) => {
                    const dayKey = date.toISOString().split('T')[0]
                    const isEmpty = dayShifts.length === 0 && dayTimeOff.length === 0
                    return (
                      <div
                        key={dayKey}
                        className="bg-bar-card rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow"
                      >
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-bar-dark">
                          <h3 className="font-bold text-xl">{formatDayHeader(date)}</h3>
                          <span className="text-gray-400 text-sm">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {isEmpty ? (
                          <div className="text-center py-6 text-gray-400">
                            <div className="text-lg">📅 No shifts</div>
                            <p className="text-sm mt-1">Tap + to add a shift</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {dayShifts.map(s => (
                              <div
                                key={s.id}
                                className={`p-3 rounded-lg border-l-4 ${getRoleColor(s.role)} border-opacity-80 bg-bar-blue/10`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-semibold">{s.name}</div>
                                  {hasRole('manager') && (
                                    <button
                                      onClick={() => deleteShift(s.id)}
                                      className="text-red-500 hover:bg-red-500/20 p-1 rounded"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-gray-400 text-sm mt-1">
                                  {formatTime12(s.start)} – {formatTime12(s.end)}
                                </div>
                                {s.role && (
                                  <div className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-bar-dark text-gray-300">
                                    {s.role}
                                  </div>
                                )}
                              </div>
                            ))}
                            {dayTimeOff.map(to => (
                              <div
                                key={to.id}
                                className="bg-yellow-600/20 border-l-4 border-yellow-600 p-3 rounded-lg"
                              >
                                <div className="font-semibold text-yellow-300">⛱️ OFF: {to.name}</div>
                                <div className="text-gray-300 text-sm">{to.dates}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!anyShiftsOrTimeOff && (
                  <div className="text-center py-8 text-gray-400">
                    No shifts scheduled this week. Add one to get started!
                  </div>
                )}
              </>
            )
          })()}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Day‑stacked list (mobile: single column, desktop: multi‑column) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getDaysToShow().map(({ date, shifts: dayShifts, timeOff: dayTimeOff }) => {
              const dayKey = date.toISOString().split('T')[0]
              const isEmpty = dayShifts.length === 0 && dayTimeOff.length === 0
              return (
                <div
                  key={dayKey}
                  className="bg-bar-card rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-bar-dark">
                    <h3 className="font-bold text-xl">{formatDayHeader(date)}</h3>
                    <span className="text-gray-400 text-sm">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {isEmpty ? (
                    <div className="text-center py-6 text-gray-400">
                      <div className="text-lg">📅 No shifts</div>
                      <p className="text-sm mt-1">Tap + to add a shift</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayShifts.map(s => (
                        <div
                          key={s.id}
                          className={`p-3 rounded-lg border-l-4 ${getRoleColor(s.role)} border-opacity-80 bg-bar-blue/10`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="font-semibold">{s.name}</div>
                            {hasRole('manager') && (
                              <button
                                onClick={() => deleteShift(s.id)}
                                className="text-red-500 hover:bg-red-500/20 p-1 rounded"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="text-gray-400 text-sm mt-1">
                            {formatTime12(s.start)} – {formatTime12(s.end)}
                          </div>
                          {s.role && (
                            <div className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-bar-dark text-gray-300">
                              {s.role}
                            </div>
                          )}
                        </div>
                      ))}
                      {dayTimeOff.map(to => (
                        <div
                          key={to.id}
                          className="bg-yellow-600/20 border-l-4 border-yellow-600 p-3 rounded-lg"
                        >
                          <div className="font-semibold text-yellow-300">⛱️ OFF: {to.name}</div>
                          <div className="text-gray-300 text-sm">{to.dates}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {shifts.filter(s => s.month === currentMonth && s.year === currentYear).length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No shifts scheduled this month. Add one to get started!
            </div>
          )}
        </div>
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