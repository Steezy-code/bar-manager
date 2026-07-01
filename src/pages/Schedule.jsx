import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { PlusIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useNotifications } from '../components/Notifications'
import IconButton from '../components/IconButton'
import { useAppRefresh } from '../hooks/usePullToRefresh'
import { parseCSV, csvEscape } from '../lib/csv'

// Format HH:MM to h:mm AM/PM
const formatTime12 = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

const timeToMinutes = (time24) => {
  if (!time24 || !time24.includes(':')) return null
  const [hours, minutes] = time24.split(':').map(Number)
  return hours * 60 + minutes
}

const shiftsOverlap = (aStart, aEnd, bStart, bEnd) => {
  const startA = timeToMinutes(aStart)
  const endA = timeToMinutes(aEnd)
  const startB = timeToMinutes(bStart)
  const endB = timeToMinutes(bEnd)

  if ([startA, endA, startB, endB].some(value => value === null)) return false
  return startA < endB && startB < endA
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

// Helper to convert day/month/year to Supabase date string (YYYY-MM-DD)
// Helper to convert year, zero-indexed month (0-11), day (1-31) to Supabase date string (YYYY-MM-DD)
const formatDateForSupabase = (year, monthZeroIndexed, day) => {
  const month = monthZeroIndexed + 1; // convert to 1-indexed for date string
  const monthStr = month < 10 ? `0${month}` : month;
  const dayStr = day < 10 ? `0${day}` : day;
  return `${year}-${monthStr}-${dayStr}`;
};

// Helper to parse Supabase date string (YYYY-MM-DD) to { year, month (0-11), day (1-31) }
const parseSupabaseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    year,
    month: month - 1, // convert 1-indexed month to zero-indexed
    day
  };
}

// Helper to convert weekday abbreviation (Sun, Mon, etc.) to day of month (1-31) for given year/month
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

const daysInMonthOf = (year, monthZeroIndexed) => new Date(year, monthZeroIndexed + 1, 0).getDate();

// Parse day input (number or weekday abbreviation) to a valid day of the month.
// Clamps to the real length of the target month so we never build an impossible
// date like 2026-02-31 (which Postgres rejects, failing the whole import/insert).
const parseDay = (dayRaw, year, monthZeroIndexed) => {
  if (!dayRaw) return 1;
  const num = parseInt(dayRaw, 10);
  if (!isNaN(num)) return Math.max(1, Math.min(num, daysInMonthOf(year, monthZeroIndexed)));
  // treat as weekday abbreviation
  return weekdayAbbrToDayOfMonth(dayRaw, year, monthZeroIndexed);
};

// Expand a "days" string into day numbers. Accepts comma lists and ranges, e.g.
// "15,16,17" or "15-17" → [15,16,17]. Unparseable parts are dropped.
const parseDayNumbers = (days) => {
  if (!days) return [];
  return String(days).split(',').flatMap(part => {
    const trimmed = part.trim();
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = parseInt(range[1], 10);
      const end = parseInt(range[2], 10);
      if (start <= end) return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? [n] : [];
  });
};

const normalizeName = (value) => String(value || '').trim().toLowerCase()

export default function Schedule() {
  const { user } = useAuth()
  const { hasRole } = usePermissions()
  const { notify, confirmAction } = useNotifications()
  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [roleFilter, setRoleFilter] = useState('all') // all, bartender, server, cook, manager
  const [showAddShift, setShowAddShift] = useState(false)
  const [showCopyWeek, setShowCopyWeek] = useState(false)
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false)
  const [builderShifts, setBuilderShifts] = useState([])
  const [expandedBuilderGroups, setExpandedBuilderGroups] = useState({})
  const [scheduleIssues, setScheduleIssues] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [profilesList, setProfilesList] = useState([])
  const [staffNameMap, setStaffNameMap] = useState(new Map())
  const [profilesUnavailable, setProfilesUnavailable] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [deletingShiftId, setDeletingShiftId] = useState(null)
  const [copyToMonth, setCopyToMonth] = useState(0)
  const [newShift, setNewShift] = useState({ staffId: '', name: '', day: 1, start: '16:00', end: '23:00', role: 'server' })
  const [loading, setLoading] = useState(true)
  const csvRef = useRef(null)
  const [showPatternModal, setShowPatternModal] = useState(false)
  const [patternShift, setPatternShift] = useState({ 
    staffId: '', 
    role: 'staff', 
    start: '16:00', 
    end: '23:00', 
    days: [1, 2, 3, 4, 5] // Monday-Friday (0=Sunday)
  })

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
      notify('Failed to load schedule from database.', 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  const fetchTimeOff = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.TIME_OFF)
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      
      if (error) throw error

      // Detect month indexing: if any month > 11, assume 1-indexed (calendar months) and convert to zero-indexed
      const hasOneIndexed = data && data.some(to => to.month > 11);
      const mapped = (data || []).map(to => ({
        ...to,
        month: hasOneIndexed ? to.month - 1 : to.month
      }));
      if (hasOneIndexed) {
        console.warn('Detected 1-indexed months in time-off requests; applying conversion. Run migration 20260408040000_fix_time_off_month_index.sql.');
      }
      setTimeOff(mapped)
    } catch (err) {
      console.error('Error fetching time off:', err)
      notify('Failed to load time off from database.', 'error')
    }
  }, [notify])

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('status', 'approved')
        .order('full_name', { ascending: true })
      if (error) throw error
      setProfilesList(data || [])
      setStaffNameMap(new Map((data || []).map(p => [p.id, p.full_name || p.email])))
      setProfilesUnavailable(false)
    } catch (err) {
      console.error('Error fetching profiles:', err)
      setProfilesList([])
      setProfilesUnavailable(true)
    }
  }, [])

  // Fetch time off from Supabase (approved only)
  useEffect(() => {
    fetchShifts()
    fetchTimeOff()
    fetchProfiles()
  }, [fetchShifts, fetchTimeOff, fetchProfiles])

  const getStaffNameFromProfile = (staffId, fallbackName = '') => {
    return staffNameMap.get(staffId) || fallbackName || 'Unknown'
  }

  const getBuilderStaffName = (shift) => getStaffNameFromProfile(shift.staffId, shift.name)

  const getBuilderGroupKey = (shift) => {
    if (shift.staffId) return `staff:${shift.staffId}`
    const name = normalizeName(shift.name)
    return name ? `name:${name}` : 'unassigned'
  }

  const getStaffIdFromProfile = (staffId) => {
    const staffProfile = profilesList.find(p => p.id === staffId)
    return staffProfile?.id || user?.id
  }

  const getTimeOffForDate = (year, month, day) => {
    return timeOff.filter(to => {
      if (to.year !== year || to.month !== month || !to.days) return false
      return parseDayNumbers(to.days).includes(day)
    })
  }

  const toProposedShift = (shift, year = currentYear, month = currentMonth) => {
    const date = formatDateForSupabase(year, month, parseDay(shift.day, year, month))
    const staffName = getStaffNameFromProfile(shift.staffId, shift.name)
    return {
      staff_name: staffName,
      date,
      start_time: shift.start,
      end_time: shift.end,
      role: shift.role || 'staff',
      user_id: getStaffIdFromProfile(shift.staffId)
    }
  }

  const findExistingShiftConflicts = (proposedShifts, existingShifts = shifts) => {
    const conflicts = []
    const normProposed = proposedShifts.map(s => ({ ...s, _n: normalizeName(s.staff_name) }))
    const normExisting = existingShifts.map(s => ({ ...s, _n: normalizeName(s.name) }))
    normProposed.forEach(proposed => {
      const { year, month, day } = parseSupabaseDate(proposed.date)
      normExisting.forEach(existing => {
        if (
          existing._n === proposed._n &&
          existing.year === year &&
          existing.month === month &&
          existing.day === day &&
          shiftsOverlap(existing.start, existing.end, proposed.start_time, proposed.end_time)
        ) {
          conflicts.push({
            name: proposed.staff_name,
            date: proposed.date,
            existing: `${formatTime12(existing.start)} - ${formatTime12(existing.end)}`,
            proposed: `${formatTime12(proposed.start_time)} - ${formatTime12(proposed.end_time)}`
          })
        }
      })
    })
    return conflicts
  }

  const findInternalShiftConflicts = (proposedShifts) => {
    const conflicts = []
    const norm = proposedShifts.map(s => ({ ...s, _n: normalizeName(s.staff_name) }))
    for (let i = 0; i < norm.length; i++) {
      for (let j = i + 1; j < norm.length; j++) {
        const left = norm[i]
        const right = norm[j]
        if (
          left._n === right._n &&
          left.date === right.date &&
          shiftsOverlap(left.start_time, left.end_time, right.start_time, right.end_time)
        ) {
          conflicts.push({
            name: left.staff_name,
            date: left.date,
            existing: `${formatTime12(left.start_time)} - ${formatTime12(left.end_time)}`,
            proposed: `${formatTime12(right.start_time)} - ${formatTime12(right.end_time)}`
          })
        }
      }
    }
    return conflicts
  }

  const findTimeOffWarnings = (proposedShifts) => {
    const warnings = []
    proposedShifts.forEach(proposed => {
      const { year, month, day } = parseSupabaseDate(proposed.date)
      const matchingTimeOff = getTimeOffForDate(year, month, day).filter(to =>
        normalizeName(to.name || to.staff_name || to.full_name) === normalizeName(proposed.staff_name)
      )
      matchingTimeOff.forEach(to => {
        warnings.push({
          name: proposed.staff_name,
          date: proposed.date,
          shift: `${formatTime12(proposed.start_time)} - ${formatTime12(proposed.end_time)}`,
          timeOff: to.dates || `${months[month]} ${day}, ${year}`
        })
      })
    })
    return warnings
  }

  const showBlockingIssues = (title, conflicts = [], warnings = []) => {
    setScheduleIssues({ title, conflicts, warnings })
  }

  // Schedule Builder Functions
  const loadExistingShifts = () => {
    const existing = shifts.filter(s => s.year === currentYear && s.month === currentMonth)
    const mapped = existing.map(s => ({
      id: `builder-${s.id}`,
      staffId: profilesList.find(p => normalizeName(p.full_name) === normalizeName(s.name))?.id || '',
      name: s.name,
      day: s.day,
      start: s.start,
      end: s.end,
      role: s.role || 'staff'
    }))
    setBuilderShifts(mapped)
  }

  const addEmptyShift = () => {
    const newId = `temp-${Date.now()}-${Math.random()}`
    setBuilderShifts(prev => [...prev, {
      id: newId,
      staffId: '',
      name: '',
      day: 1,
      start: '16:00',
      end: '23:00',
      role: 'staff'
    }])
  }

  const removeShift = (id) => {
    setBuilderShifts(prev => prev.filter(s => s.id !== id))
  }

  const updateShift = (id, field, value) => {
    setBuilderShifts(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const toggleBuilderGroup = (key) => {
    setExpandedBuilderGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const expandAllBuilderGroups = () => {
    setExpandedBuilderGroups(Object.fromEntries(builderShiftGroups.map(group => [group.key, true])))
  }

  const collapseAllBuilderGroups = () => {
    setExpandedBuilderGroups({})
  }

  const copyLastMonth = () => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevShifts = shifts.filter(s => s.year === prevYear && s.month === prevMonth)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const adjusted = prevShifts.filter(s => s.day > daysInMonth).length
    const mapped = prevShifts.map(s => {
      const day = s.day > daysInMonth ? daysInMonth : s.day
      return {
        id: `copy-${s.id}-${Date.now()}`,
        staffId: profilesList.find(p => normalizeName(p.full_name) === normalizeName(s.name))?.id || '',
        name: s.name,
        day,
        start: s.start,
        end: s.end,
        role: s.role || 'staff'
      }
    })
    setBuilderShifts(prev => [...prev, ...mapped])
    notify(
      `Added ${mapped.length} shifts from ${months[prevMonth]} ${prevYear}.${adjusted > 0 ? ` ${adjusted} shift(s) had their day adjusted to fit ${months[currentMonth]}.` : ''}`,
      'success'
    )
  }

  const updatePatternShift = (field, value) => {
    setPatternShift(prev => ({ ...prev, [field]: value }))
  }

  const addPatternShifts = () => {
    const { staffId, role, start, end, days } = patternShift
    if (!staffId) {
      notify('Please select a staff member.', 'error')
      return
    }
    const staffProfile = profilesList.find(p => p.id === staffId)
    if (!staffProfile) return

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const newShifts = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const weekday = date.getDay() // 0=Sunday, 1=Monday, ...
      if (days.includes(weekday)) {
        newShifts.push({
          id: `pattern-${Date.now()}-${day}`,
          staffId,
          name: staffProfile.full_name,
          day,
          start,
          end,
          role
        })
      }
    }
    setBuilderShifts(prev => [...prev, ...newShifts])
    setShowPatternModal(false)
    notify(`Added ${newShifts.length} shifts for ${staffProfile.full_name}.`, 'success')
  }

  const builderShiftGroups = useMemo(() => {
    const groups = new Map()

    builderShifts.forEach((shift, index) => {
      const key = getBuilderGroupKey(shift)
      const name = getBuilderStaffName(shift)
      if (!groups.has(key)) {
        groups.set(key, { key, name, firstIndex: index, shifts: [] })
      }
      groups.get(key).shifts.push(shift)
    })

    return Array.from(groups.values())
      .map(group => {
        const sortedShifts = [...group.shifts].sort((a, b) => (
          Number(a.day || 0) - Number(b.day || 0) ||
          String(a.start || '').localeCompare(String(b.start || ''))
        ))
        const days = sortedShifts.map(shift => Number(shift.day)).filter(Number.isFinite)
        const roleTimeCombos = [...new Set(sortedShifts.map(shift => (
          `${shift.role || 'staff'} ${formatTime12(shift.start)}-${formatTime12(shift.end)}`
        )))]

        return {
          ...group,
          shifts: sortedShifts,
          sortName: normalizeName(group.name) || `zz-${group.firstIndex}`,
          daySummary: days.length
            ? days.length === 1
              ? `Day ${days[0]}`
              : `Days ${Math.min(...days)}-${Math.max(...days)}`
            : 'No days',
          roleTimeSummary: roleTimeCombos.length <= 2
            ? roleTimeCombos.join(', ')
            : `${roleTimeCombos.length} shift types`
        }
      })
      .sort((a, b) => a.sortName.localeCompare(b.sortName) || a.firstIndex - b.firstIndex)
  }, [builderShifts, staffNameMap])

  const generateSchedule = async () => {
    if (!hasRole('manager')) {
      notify('Only managers can generate schedules.', 'error')
      return
    }

    const shiftsToInsert = builderShifts
      .map(shift => toProposedShift(shift))
      .filter(s => s.staff_name && s.start_time && s.end_time)

    if (shiftsToInsert.length === 0) {
      notify('No valid shifts to insert.', 'error')
      return
    }

    const builderConflicts = findInternalShiftConflicts(shiftsToInsert)
    const timeOffWarnings = findTimeOffWarnings(shiftsToInsert)

    if (builderConflicts.length > 0) {
      showBlockingIssues('Schedule conflicts found', builderConflicts)
      return
    }

    if (timeOffWarnings.length > 0) {
      showBlockingIssues('Approved time off conflicts', [], timeOffWarnings)
      return
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const startDate = formatDateForSupabase(currentYear, currentMonth, 1)
    const endDate = formatDateForSupabase(currentYear, currentMonth, daysInMonth)
    const existingCount = shifts.filter(s => s.year === currentYear && s.month === currentMonth).length
    const monthLabel = `${months[currentMonth]} ${currentYear}`

    const confirmed = await confirmAction({
      title: existingCount > 0 ? 'Replace month schedule?' : 'Generate schedule?',
      message: existingCount > 0
        ? `Replace ${existingCount} existing shifts in ${monthLabel} with ${shiftsToInsert.length} new shifts?`
        : `Add ${shiftsToInsert.length} shifts to ${monthLabel}?`,
      confirmLabel: existingCount > 0 ? 'Replace' : 'Add',
      danger: existingCount > 0
    })
    if (!confirmed) return

    setIsGenerating(true)
    try {
      // Snapshot the month's existing shifts first so a failed insert can't leave the
      // month wiped — if the insert errors we put the originals back.
      const { data: snapshot, error: snapshotError } = await supabase
        .from(TABLES.SHIFTS)
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
      if (snapshotError) throw snapshotError

      const { error: deleteError } = await supabase
        .from(TABLES.SHIFTS)
        .delete()
        .gte('date', startDate)
        .lte('date', endDate)
      if (deleteError) throw deleteError

      const { error } = await supabase
        .from(TABLES.SHIFTS)
        .insert(shiftsToInsert)
        .select('*')
      if (error) {
        if (snapshot && snapshot.length > 0) {
          await supabase.from(TABLES.SHIFTS).insert(snapshot)
        }
        throw error
      }

      await fetchShifts()
      setShowScheduleBuilder(false)
      notify(`Schedule generated with ${shiftsToInsert.length} shifts.`, 'success')
    } catch (err) {
      console.error('Error generating schedule:', err)
      notify('Failed to generate schedule.', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  // Add Shift to Supabase
  const addShift = async (e) => {
    e.preventDefault()
    if (!user) {
      notify('You must be logged in to add a shift.', 'error')
      return
    }

    const selectedProfile = profilesList.find(p => p.id === newShift.staffId)
    const staffName = selectedProfile?.full_name || selectedProfile?.email || newShift.name.trim()

    if (!staffName) {
      notify('Choose or enter a staff name.', 'error')
      return
    }

    const proposedShift = {
      staff_name: staffName,
      date: formatDateForSupabase(currentYear, currentMonth, parseDay(newShift.day, currentYear, currentMonth)),
      start_time: newShift.start,
      end_time: newShift.end,
      user_id: selectedProfile?.id || user.id,
      role: newShift.role || 'server'
    }
    const conflicts = findExistingShiftConflicts([proposedShift])
    const timeOffWarnings = findTimeOffWarnings([proposedShift])

    if (conflicts.length > 0) {
      showBlockingIssues('Shift conflict found', conflicts)
      return
    }

    if (timeOffWarnings.length > 0) {
      const confirmed = await confirmAction({
        title: 'Time off warning',
        message: `${staffName} has approved time off on this day. Add the shift anyway?`,
        confirmLabel: 'Add Anyway',
        danger: false
      })
      if (!confirmed) return
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.SHIFTS)
        .insert([proposedShift])
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
      setNewShift({ staffId: '', name: '', day: 1, start: '16:00', end: '23:00', role: 'server' })
      notify('Shift added.', 'success')
    } catch (err) {
      console.error('Error adding shift:', err)
      notify('Failed to add shift to database.', 'error')
    }
  }

  const deleteShift = async (id) => {
    if (deletingShiftId) return
    const confirmed = await confirmAction({
      title: 'Delete shift?',
      message: 'This shift will be removed from the schedule.',
      confirmLabel: 'Delete',
      danger: true
    })
    if (!confirmed) return

    setDeletingShiftId(id)
    try {
      const { error } = await supabase
        .from(TABLES.SHIFTS)
        .delete()
        .eq('id', id)
      if (error) throw error

      setShifts(prev => prev.filter(s => s.id !== id))
      notify('Shift deleted.', 'success')
    } catch (err) {
      console.error('Error deleting shift:', err)
      notify('Failed to delete shift from database.', 'error')
    } finally {
      setDeletingShiftId(null)
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
      return parseDayNumbers(to.days).includes(dayNum)
    })
  }

  const clearAll = async () => {
    const confirmed = await confirmAction({
      title: 'Clear schedule?',
      message: 'Clear all shifts and approved time off for this month? This cannot be undone.',
      confirmLabel: 'Clear',
      danger: true
    })
    if (!confirmed) return;

    if (!hasRole('manager')) {
      notify('Only managers can clear shifts.', 'error');
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

      // Delete approved time-off entries for the displayed month by id. `timeOff` is
      // already normalized to zero-indexed months on fetch, so this avoids re-deriving
      // the stored month convention here (the old .eq('month', currentMonth) deleted the
      // wrong month if the DB held 1-indexed values).
      const monthTimeOffIds = timeOff
        .filter(to => to.year === currentYear && to.month === currentMonth)
        .map(to => to.id);

      if (monthTimeOffIds.length > 0) {
        const { error: timeOffError } = await supabase
          .from(TABLES.TIME_OFF)
          .delete()
          .in('id', monthTimeOffIds);

        if (timeOffError) throw timeOffError;
      }

      // Refresh UI
      await fetchShifts();
      await fetchTimeOff();

      notify(`Cleared all shifts and time off for ${months[currentMonth]} ${currentYear}.`, 'success');
    } catch (err) {
      console.error('Error clearing schedule:', err);
      notify('Failed to clear schedule.', 'error');
    }
  }

  const refreshSchedule = () => {
    fetchShifts()
    fetchTimeOff()
  }

  useAppRefresh(refreshSchedule)

  const exportCSV = () => {
    const header = "Name,Day,Start,End,Role,Month,Year";
    const data = shifts.map(s => {
      const month = s.month !== undefined ? s.month + 1 : currentMonth + 1;
      const year = s.year !== undefined ? s.year : currentYear;
      return [s.name, s.day, s.start, s.end, s.role || '', month, year].map(csvEscape).join(',');
    });
    const csv = header + "\n" + data.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const handleCopyMonth = async () => {
    const monthShifts = shifts.filter(s => s.month === currentMonth && s.year === currentYear)
    if (monthShifts.length === 0) {
      notify('No shifts to copy from this month.', 'error')
      return
    }

    const targetMonth = parseInt(copyToMonth)
    const targetYear = currentYear
    const targetDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()

    // Build shifts to insert
    const shiftsToInsert = []
    for (const shift of monthShifts) {
      if (shift.day > targetDaysInMonth) {
        // Skip shifts that would land on a nonexistent day in target month
        continue
      }
      shiftsToInsert.push({
        staff_name: shift.name,
        date: formatDateForSupabase(targetYear, targetMonth, shift.day),
        start_time: shift.start,
        end_time: shift.end,
        role: shift.role || 'staff',
        user_id: user?.id
      })
    }

    if (shiftsToInsert.length === 0) {
      notify('No valid shifts to copy. Some days may exceed the target month length.', 'error')
      return
    }

    const existingShiftsInTarget = shifts.filter(s => s.month === targetMonth && s.year === targetYear)
    const conflicts = findExistingShiftConflicts(shiftsToInsert, existingShiftsInTarget)
    const timeOffWarnings = findTimeOffWarnings(shiftsToInsert)

    if (conflicts.length > 0) {
      showBlockingIssues('Copy conflicts found', conflicts)
      return
    }

    if (timeOffWarnings.length > 0) {
      const confirmed = await confirmAction({
        title: 'Time off warnings',
        message: `${timeOffWarnings.length} copied shifts land on approved time off. Copy them anyway?`,
        confirmLabel: 'Copy Anyway',
        danger: false
      })
      if (!confirmed) return
    }

    try {
      const { error } = await supabase
        .from(TABLES.SHIFTS)
        .insert(shiftsToInsert)
        .select('*')

      if (error) throw error

      // Refresh shifts from Supabase
      await fetchShifts()
      setShowCopyWeek(false)
      notify(`Copied ${shiftsToInsert.length} shifts to ${months[targetMonth]}.`, 'success')
    } catch (err) {
      console.error('Error copying shifts:', err)
      notify('Failed to copy shifts to database.', 'error')
    }
  }

  const importCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rows = parseCSV(event.target.result);
      if (rows.length < 2) {
        notify('CSV file is empty or has no data rows.', 'error');
        return;
      }

      // Parse header
      const headers = rows[0].map(h => String(h || '').trim());
      const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name');
      const dayIdx = headers.findIndex(h => h.toLowerCase() === 'day');
      const startIdx = headers.findIndex(h => h.toLowerCase() === 'start');
      const endIdx = headers.findIndex(h => h.toLowerCase() === 'end');
      const roleIdx = headers.findIndex(h => h.toLowerCase() === 'role');
      const monthIdx = headers.findIndex(h => h.toLowerCase() === 'month');
      const yearIdx = headers.findIndex(h => h.toLowerCase() === 'year');

      if (nameIdx === -1 || dayIdx === -1) {
        notify('CSV must have at least "Name" and "Day" columns.', 'error');
        return;
      }

      const shiftsToInsert = [];

      for (let i = 1; i < rows.length; i++) {
        const parts = rows[i].map(p => String(p ?? '').trim());
        const name = parts[nameIdx];
        if (!name) continue; // skip empty rows

        const dayRaw = parts[dayIdx] || '1';
        const start = parts[startIdx] || '16:00';
        const end = parts[endIdx] || '23:00';
        const role = parts[roleIdx] || 'staff';
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
        notify('No valid shifts found in CSV.', 'error');
        return;
      }

      const conflicts = [
        ...findExistingShiftConflicts(shiftsToInsert),
        ...findInternalShiftConflicts(shiftsToInsert)
      ];
      const timeOffWarnings = findTimeOffWarnings(shiftsToInsert);

      if (conflicts.length > 0) {
        showBlockingIssues('CSV import conflicts found', conflicts);
        return;
      }

      if (timeOffWarnings.length > 0) {
        const confirmed = await confirmAction({
          title: 'Time off warnings',
          message: `${timeOffWarnings.length} imported shifts land on approved time off. Import them anyway?`,
          confirmLabel: 'Import Anyway',
          danger: false
        });
        if (!confirmed) return;
      }

      try {
        // Batch insert into Supabase
        const { error } = await supabase
          .from(TABLES.SHIFTS)
          .insert(shiftsToInsert)
          .select('*');

        if (error) throw error;

        // Refresh shifts from Supabase
        await fetchShifts();
        notify(`Successfully imported ${shiftsToInsert.length} shifts.`, 'success');
      } catch (err) {
        console.error('Error importing shifts:', err);
        notify('Failed to import shifts.', 'error');
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
    const d = new Date(currentDate)
    if (view === 'week') { d.setDate(d.getDate() - 7) } else { d.setMonth(d.getMonth() - 1) }
    setCurrentDate(d)
  }
  const nextView = () => {
    const d = new Date(currentDate)
    if (view === 'week') { d.setDate(d.getDate() + 7) } else { d.setMonth(d.getMonth() + 1) }
    setCurrentDate(d)
  }
  const goToday = () => setCurrentDate(new Date())

  const daysToShow = useMemo(() => {
    const days = []
    if (view === 'week') {
      const start = new Date(currentDate)
      start.setDate(start.getDate() - start.getDay())
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(start)
        dayDate.setDate(start.getDate() + i)
        const year = dayDate.getFullYear()
        const month = dayDate.getMonth()
        const day = dayDate.getDate()
        const dayShifts = shifts.filter(s =>
          s.year === year && s.month === month && s.day === day &&
          (roleFilter === 'all' || s.role === roleFilter)
        )
        const dayTimeOff = timeOff.filter(to =>
          to.year === year && to.month === month && to.days &&
          parseDayNumbers(to.days).includes(day)
        )
        days.push({ date: dayDate, shifts: dayShifts, timeOff: dayTimeOff })
      }
    } else {
      for (let i = 1; i <= daysInMonth; i++) {
        const year = currentYear
        const month = currentMonth
        const day = i
        const dayShifts = shifts.filter(s =>
          s.year === year && s.month === month && s.day === day &&
          (roleFilter === 'all' || s.role === roleFilter)
        )
        const dayTimeOff = timeOff.filter(to =>
          to.year === year && to.month === month && to.days &&
          parseDayNumbers(to.days).includes(day)
        )
        days.push({ date: new Date(year, month, day), shifts: dayShifts, timeOff: dayTimeOff })
      }
    }
    return days
  }, [view, currentDate, shifts, timeOff, roleFilter, daysInMonth, currentYear, currentMonth])

  const formatDayHeader = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-gray-400">Manage shifts faster on smaller screens</p>
        </div>
        <div className="flex gap-2 flex-wrap print:hidden">
          <button onClick={printSchedule} className="btn-secondary text-sm">Print</button>
          <button onClick={refreshSchedule} className="btn-secondary text-sm">Refresh</button>
          <button onClick={() => setView(view === 'week' ? 'month' : 'week')} className="btn-primary">
            {view === 'week' ? 'Month' : 'Week'}
          </button>
          {hasRole('manager') && (
            <button onClick={() => setShowAddShift(true)} className="btn-primary">
              <PlusIcon className="w-5 h-5" /> Add
            </button>
          )}
        </div>
      </div>
      <input type="file" accept=".csv" ref={csvRef} onChange={importCSV} className="hidden" />

      {hasRole('manager') && (
        <div className="bg-bar-card rounded-xl p-4 print:hidden">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Build schedule</h2>
              <p className="text-sm text-gray-400">Add, copy, import, export, or replace shifts for the current schedule.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowAddShift(true)} className="btn-primary text-sm">Add Shift</button>
              <button onClick={() => setShowScheduleBuilder(true)} disabled={isBuilding} className="btn-secondary text-sm">Build Month</button>
              <button onClick={() => setShowCopyWeek(true)} className="btn-secondary text-sm">Copy Month</button>
              <button onClick={() => csvRef.current.click()} className="btn-secondary text-sm">Import CSV</button>
              <button onClick={exportCSV} className="btn-secondary text-sm">Export CSV</button>
              <button onClick={clearAll} className="btn-secondary text-sm text-red-400">Clear Month</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={prevView} className="p-3 bg-bar-card rounded-lg hover:bg-bar-blue transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
        <button onClick={goToday} className="px-4 py-3 bg-bar-accent rounded-lg text-sm font-semibold hover:bg-bar-accent/80 transition-colors">Today</button>
        <h2 className="text-lg md:text-xl font-bold min-w-[200px] text-center flex-1">{monthName}</h2>
        <button onClick={nextView} className="p-3 bg-bar-card rounded-lg hover:bg-bar-blue transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
      </div>

      {/* Role filter tabs — horizontal scroll-snap with comfortable taps */}
      <div className="relative mt-4 mb-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 snap-x scrollbar-none md:mx-0 md:justify-center md:flex-wrap md:px-0">
          {[
            { key: 'all', label: 'All Roles' },
            { key: 'bartender', label: 'Bar' },
            { key: 'server', label: 'Server' },
            { key: 'cook', label: 'Kitchen' },
            { key: 'manager', label: 'Manager' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className={`shrink-0 snap-start min-h-touch rounded-lg px-4 font-medium transition active:scale-[0.97] ${roleFilter === key ? 'bg-bar-accent font-semibold text-white' : 'bg-bar-card text-gray-300 hover:bg-bar-blue'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bar-dark to-transparent md:hidden" />
      </div>

      {view === 'week' ? (
        <div className="space-y-6">
          {/* Day-stacked list for week view */}
          {(() => {
            const days = daysToShow
            const anyShiftsOrTimeOff = days.some(day => day.shifts.length > 0 || day.timeOff.length > 0)
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {days.map(({ date, shifts: dayShifts, timeOff: dayTimeOff }, idx) => {
                    const dayKey = date.toISOString().split('T')[0]
                    const isEmpty = dayShifts.length === 0 && dayTimeOff.length === 0
                    return (
                      <div
                        key={dayKey}
                        className="bg-bar-card rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow animate-fade-slide-up"
                        style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
                      >
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-bar-dark">
                          <h3 className="font-bold text-xl">{formatDayHeader(date)}</h3>
                          <span className="text-gray-400 text-sm">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {isEmpty ? (
                          <div className="text-center py-6 text-gray-400">
                            <div className="text-lg">No shifts</div>
                            <p className="text-sm mt-1">Tap + to add a shift</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {dayShifts.map(s => {
                              const hasConflict = dayShifts.some(other =>
                                other.id !== s.id &&
                                other.name === s.name &&
                                shiftsOverlap(s.start, s.end, other.start, other.end)
                              )

                              return (
                                <div
                                  key={s.id}
                                  className={`p-3 rounded-lg border-l-4 ${hasConflict ? 'border-red-500 bg-red-500/10' : `${getRoleColor(s.role)} border-opacity-80 bg-bar-blue/10`}`}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="font-semibold">{s.name}</div>
                                    {hasRole('manager') && (
                                      <IconButton icon={TrashIcon} label={`Delete shift for ${s.name}`} tone="danger" disabled={!!deletingShiftId} onClick={() => deleteShift(s.id)} />
                                    )}
                                  </div>
                                  <div className="text-gray-400 text-sm mt-1">
                                    {formatTime12(s.start)} - {formatTime12(s.end)}
                                  </div>
                                  {s.role && (
                                    <div className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-bar-dark text-gray-300">
                                      {s.role}
                                    </div>
                                  )}
                                  {hasConflict && (
                                    <div className="mt-2 text-xs text-red-300">Conflicts with another shift for {s.name}</div>
                                  )}
                                </div>
                              )
                            })}
                            {dayTimeOff.map(to => (
                              <div
                                key={to.id}
                                className="bg-yellow-600/20 border-l-4 border-yellow-600 p-3 rounded-lg"
                              >
                                <div className="font-semibold text-yellow-300">OFF: {to.name}</div>
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
        <div className="space-y-2">
          {/* DOW header */}
          <div className="grid grid-cols-7 gap-px">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>
          {/* Compact calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-bar-blue/20 rounded-xl overflow-hidden border border-bar-blue/30">
            {/* Leading empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-bar-dark min-h-[64px]" />
            ))}
            {/* Day cells */}
            {daysToShow.map(({ date, shifts: dayShifts, timeOff: dayTimeOff }) => {
              const dayKey = date.toISOString().split('T')[0]
              const isToday = date.toDateString() === new Date().toDateString()
              const overflow = dayShifts.length > 2 ? dayShifts.length - 2 : 0
              return (
                <div
                  key={dayKey}
                  onClick={() => setSelectedDay({ date, shifts: dayShifts, timeOff: dayTimeOff })}
                  className="relative bg-bar-card hover:bg-bar-blue/30 active:bg-bar-blue/50 cursor-pointer min-h-[64px] p-1 flex flex-col transition-colors"
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${isToday ? 'bg-bar-accent text-white' : 'text-gray-300'}`}>
                    {date.getDate()}
                  </span>
                  {dayShifts.slice(0, 2).map(s => (
                    <span key={s.id} className={`text-[10px] px-1 rounded truncate text-white mb-0.5 ${getRoleColor(s.role)}`}>
                      {s.name.split(' ')[0]}
                    </span>
                  ))}
                  {overflow > 0 && (
                    <span className="text-[10px] text-gray-300 font-medium bg-bar-blue/40 rounded px-0.5">+{overflow}</span>
                  )}
                  {dayTimeOff.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-500/60" />
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

      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center p-0 md:hidden z-50">
          <div className="bg-bar-card p-4 rounded-t-2xl w-full max-h-[75vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold">{formatDayHeader(selectedDay.date)}</h2>
                <p className="text-sm text-gray-400">
                  {selectedDay.shifts.length} shifts, {selectedDay.timeOff.length} time-off entries
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="btn-secondary text-sm">Close</button>
            </div>
            <div className="space-y-3">
              {selectedDay.shifts.length === 0 && selectedDay.timeOff.length === 0 && (
                <div className="text-center py-6 text-gray-400">No shifts scheduled for this day.</div>
              )}
              {selectedDay.shifts.map(s => (
                <div key={s.id} className={`p-3 rounded-lg border-l-4 ${getRoleColor(s.role)} border-opacity-80 bg-bar-blue/10`}>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-gray-400 text-sm mt-1">{formatTime12(s.start)} - {formatTime12(s.end)}</div>
                  {s.role && <div className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-bar-dark text-gray-300">{s.role}</div>}
                </div>
              ))}
              {selectedDay.timeOff.map(to => (
                <div key={to.id} className="bg-yellow-600/20 border-l-4 border-yellow-600 p-3 rounded-lg">
                  <div className="font-semibold text-yellow-300">OFF: {to.name}</div>
                  <div className="text-gray-300 text-sm">{to.dates}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {scheduleIssues && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-bar-card p-4 md:p-6 rounded-t-2xl md:rounded-xl w-full max-w-full md:max-w-2xl mx-auto md:mx-0 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">{scheduleIssues.title}</h2>
                <p className="text-sm text-gray-400">Review these items before saving changes.</p>
              </div>
              <button onClick={() => setScheduleIssues(null)} className="btn-secondary text-sm">Close</button>
            </div>
            {scheduleIssues.conflicts?.length > 0 && (
              <div className="mb-5">
                <h3 className="font-semibold text-red-300 mb-2">Shift conflicts</h3>
                <div className="space-y-2">
                  {scheduleIssues.conflicts.map((item, index) => (
                    <div key={`${item.name}-${item.date}-${index}`} className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-gray-300">{item.date}</div>
                      <div className="text-sm text-gray-400">Existing: {item.existing}</div>
                      <div className="text-sm text-gray-400">Proposed: {item.proposed}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {scheduleIssues.warnings?.length > 0 && (
              <div>
                <h3 className="font-semibold text-yellow-300 mb-2">Approved time off</h3>
                <div className="space-y-2">
                  {scheduleIssues.warnings.map((item, index) => (
                    <div key={`${item.name}-${item.date}-${index}`} className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-gray-300">{item.date}</div>
                      <div className="text-sm text-gray-400">Shift: {item.shift}</div>
                      <div className="text-sm text-gray-400">Time off: {item.timeOff}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Copy Month Modal */}
      {showCopyWeek && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-bar-card p-4 md:p-6 rounded-t-2xl md:rounded-xl w-full max-w-full md:max-w-md mx-auto md:mx-0">
            <h2 className="text-xl font-bold mb-4">Copy Month to Another Month</h2>
            <p className="text-gray-400 mb-4">Which month do you want to copy this month's schedule to?</p>
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
              <button onClick={handleCopyMonth} className="btn-primary flex-1">Copy to {months[copyToMonth]}</button>
            </div>
          </div>
        </div>
      )}

      {showAddShift && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <form onSubmit={addShift} className="bg-bar-card p-4 md:p-6 rounded-t-2xl md:rounded-xl w-full max-w-full md:max-w-md space-y-3 mx-auto md:mx-0">
            <h2 className="text-xl font-bold">Add Shift for {monthName}</h2>
            {profilesList.length > 0 ? (
              <select
                className="input"
                value={newShift.staffId}
                onChange={e => {
                  const selected = profilesList.find(p => p.id === e.target.value)
                  setNewShift({ ...newShift, staffId: e.target.value, name: selected?.full_name || '' })
                }}
                required
              >
                <option value="">Select staff...</option>
                {profilesList.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.role})</option>
                ))}
              </select>
            ) : (
              <input placeholder="Staff name" className="input" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} required />
            )}
            {profilesUnavailable && (
              <p className="text-xs text-yellow-300">Staff list is unavailable, so you can still enter a name manually.</p>
            )}
            <input type="number" min="1" max={daysInMonth} placeholder={`Day (1-${daysInMonth})`} className="input" value={newShift.day} onChange={e => setNewShift({...newShift, day: +e.target.value})} />
            <div className="flex gap-2">
              <input type="time" className="input" value={newShift.start} onChange={e => setNewShift({...newShift, start: e.target.value})} />
              <input type="time" className="input" value={newShift.end} onChange={e => setNewShift({...newShift, end: e.target.value})} />
            </div>
            <select className="input" value={newShift.role} onChange={e => setNewShift({ ...newShift, role: e.target.value })}>
              <option value="bartender">Bartender</option>
              <option value="server">Server</option>
              <option value="cook">Cook</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddShift(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add Shift</button>
            </div>
          </form>
        </div>
      )}

      {showScheduleBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-bar-card p-4 md:p-6 rounded-t-2xl md:rounded-xl w-full max-w-full md:max-w-lg mx-auto md:mx-0 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Build Month Schedule</h2>
            <p className="text-gray-400 mb-4">Create shifts for {monthName}.</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={loadExistingShifts} className="btn-secondary text-sm">Load Existing Shifts</button>
              <button onClick={addEmptyShift} className="btn-primary text-sm">Add Shift</button>
              <button onClick={() => setShowPatternModal(true)} className="btn-secondary text-sm">Add Pattern</button>
              <button onClick={copyLastMonth} className="btn-secondary text-sm">Copy Last Month</button>
              <button onClick={() => { setBuilderShifts([]); setExpandedBuilderGroups({}) }} className="btn-secondary text-sm text-red-400">Clear All</button>
            </div>
            
            {builderShiftGroups.length > 1 && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-bar-blue/10 px-3 py-2 text-sm">
                <span className="text-gray-300">{builderShiftGroups.length} employees, {builderShifts.length} shifts</span>
                <div className="flex gap-2">
                  <button onClick={expandAllBuilderGroups} className="text-bar-accent hover:text-white">Expand all</button>
                  <span className="text-gray-600">/</span>
                  <button onClick={collapseAllBuilderGroups} className="text-bar-accent hover:text-white">Collapse all</button>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {builderShiftGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No shifts added yet. Click "Add Shift" to start.
                </div>
              ) : (
                builderShiftGroups.map(group => (
                  <div key={group.key} className="rounded-lg border border-bar-blue/30 bg-bar-blue/10">
                    <button
                      type="button"
                      onClick={() => toggleBuilderGroup(group.key)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-bar-blue/20"
                    >
                      {expandedBuilderGroups[group.key] ? (
                        <ChevronDownIcon className="h-5 w-5 shrink-0 text-bar-accent" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 shrink-0 text-bar-accent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-semibold">{group.name}</span>
                          <span className="rounded-full bg-bar-card px-2 py-0.5 text-xs text-gray-300">
                            {group.shifts.length} {group.shifts.length === 1 ? 'shift' : 'shifts'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {group.daySummary} · {group.roleTimeSummary}
                        </div>
                      </div>
                    </button>

                    {expandedBuilderGroups[group.key] && (
                      <div className="relative">
                      <div className="space-y-1.5 border-t border-bar-blue/30 p-2 overflow-x-auto">
                        <div className="grid grid-cols-[40px_1fr_auto_80px_32px] gap-1 px-1 min-w-[520px]">
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">Day</span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">Staff</span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">Time</span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">Role</span>
                          <span />
                        </div>
                        {group.shifts.map(shift => (
                  <div key={shift.id} className="grid grid-cols-[40px_1fr_auto_80px_32px] gap-1 items-center bg-bar-card/60 rounded-lg px-1.5 py-1 min-w-[520px]">
                    {/* Day */}
                    <select
                      className="input py-1 px-1 text-sm w-full"
                      value={shift.day}
                      onChange={e => updateShift(shift.id, 'day', parseInt(e.target.value))}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {/* Staff */}
                    {profilesList.length > 0 ? (
                      <select
                        className="input py-1 px-1 text-sm w-full"
                        value={shift.staffId}
                        onChange={e => updateShift(shift.id, 'staffId', e.target.value)}
                      >
                        <option value="">Staff...</option>
                        {profilesList.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input py-1 px-1 text-sm w-full"
                        value={shift.name}
                        onChange={e => updateShift(shift.id, 'name', e.target.value)}
                        placeholder="Name"
                      />
                    )}

                    {/* Start–End */}
                    <div className="flex items-center gap-0.5">
                      <input
                        type="time"
                        className="input py-1 px-1 text-sm w-[88px]"
                        value={shift.start}
                        onChange={e => updateShift(shift.id, 'start', e.target.value)}
                      />
                      <span className="text-gray-500 text-xs">–</span>
                      <input
                        type="time"
                        className="input py-1 px-1 text-sm w-[88px]"
                        value={shift.end}
                        onChange={e => updateShift(shift.id, 'end', e.target.value)}
                      />
                    </div>

                    {/* Role */}
                    <select
                      className="input py-1 px-1 text-sm w-full"
                      value={shift.role}
                      onChange={e => updateShift(shift.id, 'role', e.target.value)}
                    >
                      <option value="staff">Staff</option>
                      <option value="bartender">Bar</option>
                      <option value="server">Server</option>
                      <option value="cook">Cook</option>
                      <option value="manager">Mgr</option>
                    </select>

                    {/* Delete */}
                    <IconButton icon={TrashIcon} label="Remove shift" tone="danger" onClick={() => removeShift(shift.id)} />
                  </div>
                        ))}
                      </div>
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bar-dark to-transparent md:hidden" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowScheduleBuilder(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={generateSchedule} disabled={isGenerating} className="btn-primary flex-1">{isGenerating ? 'Generating…' : 'Generate Schedule'}</button>
            </div>
          </div>
        </div>
      )}

      {showPatternModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-bar-card p-4 md:p-6 rounded-t-2xl md:rounded-xl w-full max-w-full md:max-w-md mx-auto md:mx-0 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Pattern Shifts</h2>
            <p className="text-gray-400 mb-4">Add shifts for a staff member across selected weekdays for the entire month.</p>
            
            <div className="space-y-4">
              {/* Staff */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Staff</label>
                <select 
                  className="input w-full" 
                  value={patternShift.staffId}
                  onChange={e => updatePatternShift('staffId', e.target.value)}
                >
                  <option value="">Select staff...</option>
                  {profilesList.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                  ))}
                </select>
              </div>
              
              {/* Role */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select 
                  className="input w-full" 
                  value={patternShift.role}
                  onChange={e => updatePatternShift('role', e.target.value)}
                >
                  <option value="staff">Staff</option>
                  <option value="bartender">Bartender</option>
                  <option value="server">Server</option>
                  <option value="cook">Cook</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              
              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start</label>
                  <input 
                    type="time" 
                    className="input w-full" 
                    value={patternShift.start}
                    onChange={e => updatePatternShift('start', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End</label>
                  <input 
                    type="time" 
                    className="input w-full" 
                    value={patternShift.end}
                    onChange={e => updatePatternShift('end', e.target.value)}
                  />
                </div>
              </div>
              
              {/* Weekday Checkboxes */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Repeat on weekdays</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: 1, label: 'Monday' },
                    { value: 2, label: 'Tuesday' },
                    { value: 3, label: 'Wednesday' },
                    { value: 4, label: 'Thursday' },
                    { value: 5, label: 'Friday' },
                    { value: 6, label: 'Saturday' },
                    { value: 0, label: 'Sunday' }
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={patternShift.days.includes(value)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...patternShift.days, value]
                            : patternShift.days.filter(d => d !== value)
                          updatePatternShift('days', newDays)
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowPatternModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={addPatternShifts} className="btn-primary flex-1">Add Pattern Shifts</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
