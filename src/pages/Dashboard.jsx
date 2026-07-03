import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { Skeleton, SkeletonList } from '../components/Skeleton'
import { useAppRefresh } from '../hooks/usePullToRefresh'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const formatToday = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTime12 = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

const countTasks = (tasks = {}) => {
  const allTasks = Object.values(tasks).flatMap(value => Array.isArray(value) ? value : [])
  return {
    total: allTasks.length,
    completed: allTasks.filter(task => task.c).length
  }
}

const normalizeText = (value) => String(value || '').trim().toLowerCase()

const StatusPill = ({ children, tone = 'default' }) => {
  const toneClass =
    tone === 'danger'
      ? 'bg-red-500/20 text-red-200'
      : tone === 'warning'
        ? 'bg-yellow-500/20 text-yellow-100'
        : tone === 'success'
          ? 'bg-green-500/20 text-green-200'
          : 'bg-bar-blue text-gray-200'

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

// Status swatch: a tinted background behind the icon, not just a colored icon —
// tone reads from background value + icon shape, not hue alone (colorblind-safe).
const ActionRow = ({ icon: Icon, title, detail, to, actionLabel, tone = 'default' }) => {
  const swatchClass =
    tone === 'danger'
      ? 'bg-bar-danger-bg text-bar-accent-light'
      : tone === 'warning'
        ? 'bg-bar-warning-bg text-bar-warning'
        : tone === 'success'
          ? 'bg-bar-success-bg text-bar-success'
          : 'bg-bar-blue/40 text-bar-accent-light'

  return (
    <div className="flex items-center gap-3 rounded-lg bg-bar-blue/30 p-3">
      <span className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] ${swatchClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-tight">{title}</div>
        <div className="mt-0.5 truncate text-sm text-gray-400">{detail}</div>
      </div>
      <Link to={to} className="shrink-0 rounded-lg bg-bar-card px-3 py-2 text-sm font-semibold text-bar-accent-light hover:bg-bar-blue">
        {actionLabel}
      </Link>
    </div>
  )
}

const ShiftRow = ({ shift }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-bar-blue/30 p-3">
    <div className="min-w-0">
      <div className="truncate font-semibold">{shift.staff_name || 'Shift'}</div>
      <div className="text-sm text-gray-400">{shift.role || 'staff'}</div>
    </div>
    <div className="shrink-0 text-right text-sm text-gray-200">
      {formatTime12(shift.start_time)} - {formatTime12(shift.end_time)}
    </div>
  </div>
)

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { hasRole } = usePermissions()
  const canReviewRequests = hasRole('manager')
  const canManageInventory = hasRole('manager')
  const [lowItems, setLowItems] = useState([])
  const [todayShifts, setTodayShifts] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [checklistStatus, setChecklistStatus] = useState({ completed: 0, total: 0 })
  const [optionalErrors, setOptionalErrors] = useState({})
  const [greeting, setGreeting] = useState(getGreeting())
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasLoadedRef = useRef(false)

  const fetchDashboard = useCallback(async () => {
    if (hasLoadedRef.current) setIsRefreshing(true)
    else setLoading(true)

    const [invResult, shiftsResult, checklistResult, timeOffResult] = await Promise.allSettled([
      canManageInventory
        ? supabase.from(TABLES.INVENTORY).select('*').order('name', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase.from(TABLES.SHIFTS).select('*').eq('date', formatToday()).order('start_time', { ascending: true }),
      supabase.from(TABLES.CHECKLISTS).select('tasks').eq('team_id', 'main').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      canReviewRequests
        ? supabase.from(TABLES.TIME_OFF).select('*').eq('status', 'pending').order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])

    const errors = {}

    if (invResult.status === 'fulfilled' && !invResult.value.error) {
      setLowItems((invResult.value.data || []).filter(i => Number(i.quantity || 0) <= Number(i.threshold || 5)))
    } else {
      if (invResult.status === 'rejected' || invResult.value?.error) console.error('Dashboard inventory error:', invResult.reason || invResult.value?.error)
      errors.inventory = true
      setLowItems([])
    }

    if (shiftsResult.status === 'fulfilled' && !shiftsResult.value.error) {
      setTodayShifts(shiftsResult.value.data || [])
    } else {
      console.error('Dashboard shifts error:', shiftsResult.reason || shiftsResult.value?.error)
      errors.shifts = true
      setTodayShifts([])
    }

    if (checklistResult.status === 'fulfilled' && !checklistResult.value.error) {
      setChecklistStatus(countTasks(checklistResult.value.data?.tasks || {}))
    } else {
      console.error('Dashboard checklist error:', checklistResult.reason || checklistResult.value?.error)
      errors.checklists = true
      setChecklistStatus({ completed: 0, total: 0 })
    }

    if (timeOffResult.status === 'fulfilled' && !timeOffResult.value.error) {
      setPendingRequests(timeOffResult.value.data || [])
    } else {
      if (canReviewRequests) console.error('Dashboard time-off error:', timeOffResult.reason || timeOffResult.value?.error)
      errors.timeOff = true
      setPendingRequests([])
    }

    setOptionalErrors(errors)
    hasLoadedRef.current = true
    setLoading(false)
    setIsRefreshing(false)
  }, [canManageInventory, canReviewRequests])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useAppRefresh(fetchDashboard)

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60000)
    return () => clearInterval(interval)
  }, [])

  const userMatchTerms = useMemo(() => {
    const terms = [
      profile?.full_name,
      profile?.email,
      user?.email,
      user?.user_metadata?.full_name,
      user?.user_metadata?.name
    ]
    return [...new Set(terms.map(normalizeText).filter(Boolean))]
  }, [profile, user])

  const myShifts = useMemo(() => (
    todayShifts.filter(shift => {
      const staffName = normalizeText(shift.staff_name)
      // Exact normalized match only. Substring matching previously let "Al" match
      // "Alex" (and vice-versa), surfacing the wrong person's shifts.
      return staffName && userMatchTerms.includes(staffName)
    })
  ), [todayShifts, userMatchTerms])

  const checklistRemaining = Math.max(0, checklistStatus.total - checklistStatus.completed)
  const checklistPercent = checklistStatus.total
    ? Math.round((checklistStatus.completed / checklistStatus.total) * 100)
    : 0
  const hasOptionalErrors = Object.keys(optionalErrors).length > 0
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="card space-y-3">
          <Skeleton className="h-4 w-28" />
          <SkeletonList rows={4} />
        </div>
        <SkeletonList rows={3} />
      </div>
    )
  }

  const managerActionRows = [
    {
      icon: UserGroupIcon,
      title: `${pendingRequests.length} pending time off`,
      detail: pendingRequests.length ? 'Requests need review' : 'No requests waiting',
      to: '/app/timeoff',
      actionLabel: 'Review',
      tone: pendingRequests.length ? 'warning' : 'success'
    },
    {
      icon: CubeIcon,
      title: `${lowItems.length} low-stock ${lowItems.length === 1 ? 'item' : 'items'}`,
      detail: lowItems.length ? lowItems.slice(0, 3).map(item => item.name).join(', ') : 'Inventory is above thresholds',
      to: '/app/inventory',
      actionLabel: 'Open',
      tone: lowItems.length ? 'danger' : 'success'
    },
    {
      icon: ClipboardDocumentCheckIcon,
      title: checklistStatus.total ? `${checklistRemaining} checklist tasks left` : 'No checklist tasks found',
      detail: checklistStatus.total ? `${checklistStatus.completed}/${checklistStatus.total} complete` : 'Open checklists to set today up',
      to: '/app/checklists',
      actionLabel: 'Check',
      tone: checklistRemaining ? 'warning' : 'success'
    },
    {
      icon: CalendarIcon,
      title: `${todayShifts.length} shifts today`,
      detail: todayShifts.length ? 'Schedule is ready to scan' : 'No shifts scheduled today',
      to: '/app/schedule',
      actionLabel: 'View',
      tone: todayShifts.length ? 'default' : 'warning'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <p className="text-gray-400">{todayLabel}</p>
        </div>
        <button onClick={fetchDashboard} disabled={isRefreshing} className="btn-secondary self-start text-sm md:self-auto">
          <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {hasOptionalErrors && (
        <div className="card border-yellow-500 bg-yellow-500/10 text-yellow-100">
          Some dashboard details could not be loaded. The rest of the app is still available.
        </div>
      )}

      {canReviewRequests ? (
        <section className="card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Action Queue</h2>
              <p className="text-sm text-gray-400">What needs manager attention right now.</p>
            </div>
            <StatusPill tone={pendingRequests.length || lowItems.length || checklistRemaining ? 'warning' : 'success'}>
              {pendingRequests.length + lowItems.length + checklistRemaining} open
            </StatusPill>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {managerActionRows.map(row => <ActionRow key={row.title} {...row} />)}
          </div>
        </section>
      ) : (
        <section className="card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">My Day</h2>
              <p className="text-sm text-gray-400">Your shift context and daily tasks.</p>
            </div>
            <StatusPill tone={myShifts.length ? 'success' : 'default'}>
              {myShifts.length ? `${myShifts.length} shift${myShifts.length === 1 ? '' : 's'}` : 'Team view'}
            </StatusPill>
          </div>

          {myShifts.length > 0 ? (
            <div className="space-y-2">
              {myShifts.slice(0, 2).map(shift => <ShiftRow key={shift.id} shift={shift} />)}
            </div>
          ) : (
            <div className="rounded-lg bg-bar-blue/30 p-3">
              <div className="font-semibold">{todayShifts.length ? `${todayShifts.length} team shifts today` : 'No shifts scheduled today'}</div>
              <div className="text-sm text-gray-400">{todayShifts.length ? 'Open the schedule for the full team view.' : 'Check back when the schedule is posted.'}</div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <Link to="/app/schedule" className="btn-primary justify-center text-center">View schedule</Link>
            <Link to="/app/checklists" className="btn-secondary justify-center text-center">{checklistPercent}% checklists</Link>
            <Link to="/app/timeoff" className="btn-secondary justify-center text-center">Time off</Link>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Today&apos;s Schedule</h2>
              <p className="text-sm text-gray-400">{todayShifts.length} scheduled</p>
            </div>
            <Link to="/app/schedule" className="text-sm font-semibold text-bar-accent-light hover:text-white">Open</Link>
          </div>
          {todayShifts.length === 0 ? (
            <p className="rounded-lg bg-bar-blue/30 p-3 text-gray-400">No shifts scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {todayShifts.slice(0, 6).map(shift => <ShiftRow key={shift.id} shift={shift} />)}
              {todayShifts.length > 6 && (
                <Link to="/app/schedule" className="block rounded-lg bg-bar-blue/20 p-3 text-center text-sm font-semibold text-bar-accent-light hover:bg-bar-blue/40">
                  View {todayShifts.length - 6} more shifts
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="card space-y-3">
          <div>
            <h2 className="text-lg font-bold">Checklist Pulse</h2>
            <p className="text-sm text-gray-400">{checklistStatus.completed}/{checklistStatus.total} tasks complete</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bar-blue">
            <div className="h-full rounded-full bg-bar-accent transition-[width] duration-700 ease-out" style={{ width: `${checklistPercent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-bar-blue/30 p-3">
            <span className="text-sm text-gray-300">{checklistRemaining ? `${checklistRemaining} remaining` : 'All caught up'}</span>
            <Link to="/app/checklists" className="text-sm font-semibold text-bar-accent-light hover:text-white">Open checklists</Link>
          </div>
          {canManageInventory && lowItems.length > 0 && (
            <div className="rounded-lg border border-red-500/60 bg-red-500/15 p-3">
              <div className="mb-2 flex items-center gap-2 font-semibold text-red-200">
                <ExclamationTriangleIcon className="h-5 w-5" />
                Low stock
              </div>
              <div className="space-y-1 text-sm text-gray-200">
                {lowItems.slice(0, 4).map(item => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 text-red-200">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
              <Link to="/app/inventory" className="mt-3 block text-sm font-semibold text-bar-accent-light hover:text-white">Open inventory</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
