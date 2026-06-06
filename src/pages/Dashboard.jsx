import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
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

export default function Dashboard() {
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

  const fetchDashboard = useCallback(async () => {
    if (!loading) setIsRefreshing(true)
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

  const hasOptionalErrors = Object.keys(optionalErrors).length > 0

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <h1 className="text-2xl font-bold">{greeting}</h1>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          ))}
        </div>
        <SkeletonList rows={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <p className="text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={fetchDashboard} disabled={isRefreshing} className="btn-secondary self-start text-sm md:self-auto">{isRefreshing ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {hasOptionalErrors && (
        <div className="card border-yellow-500 bg-yellow-500/10 text-yellow-100">
          Some dashboard details could not be loaded. The rest of the app is still available.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {canManageInventory && (
          <Link to="/inventory" className="card block hover:border-red-400">
            <div className="mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <h2 className="font-bold">Low Stock</h2>
            </div>
            <div className="text-3xl font-bold">{lowItems.length}</div>
            <p className="mt-1 text-sm text-gray-400">{lowItems.length === 1 ? 'item needs attention' : 'items need attention'}</p>
          </Link>
        )}

        <Link to="/schedule" className="card block hover:border-green-400">
          <div className="mb-3 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-green-400" />
            <h2 className="font-bold">Today&apos;s Shifts</h2>
          </div>
          <div className="text-3xl font-bold">{todayShifts.length}</div>
          <p className="mt-1 text-sm text-gray-400">scheduled today</p>
        </Link>

        <Link to="/checklists" className="card block hover:border-blue-400">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-400" />
            <h2 className="font-bold">Checklists</h2>
          </div>
          <div className="text-3xl font-bold">{checklistStatus.completed}/{checklistStatus.total}</div>
          <p className="mt-1 text-sm text-gray-400">tasks completed</p>
        </Link>

        <Link to="/timeoff" className="card block hover:border-yellow-400">
          <div className="mb-3 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-yellow-400" />
            <h2 className="font-bold">Time Off</h2>
          </div>
          <div className="text-3xl font-bold">{canReviewRequests ? pendingRequests.length : '-'}</div>
          <p className="mt-1 text-sm text-gray-400">{canReviewRequests ? 'pending requests' : 'request status'}</p>
        </Link>
      </div>

      {canManageInventory && lowItems.length > 0 && (
        <div className="card border border-red-500 bg-red-500/20">
          <div className="mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h2 className="font-bold text-red-400">Low Stock Alert</h2>
          </div>
          <div className="space-y-2">
            {lowItems.slice(0, 6).map(i => (
              <div key={i.id} className="flex justify-between rounded bg-red-600/30 p-2">
                <span>{i.name}</span>
                <span className="text-red-300">Only {i.quantity} left</span>
              </div>
            ))}
          </div>
          <Link to="/inventory" className="btn-primary mt-4 block w-full text-center">
            Go to Inventory
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-bold">Today&apos;s Schedule</h2>
          {todayShifts.length === 0 ? (
            <p className="text-gray-400">No shifts scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todayShifts.slice(0, 6).map(shift => (
                <div key={shift.id} className="rounded-lg bg-bar-blue p-3">
                  <div className="font-semibold">{shift.staff_name || 'Shift'}</div>
                  <div className="text-sm text-gray-300">{formatTime12(shift.start_time)} - {formatTime12(shift.end_time)} {shift.role ? `(${shift.role})` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-bold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {canManageInventory && <Link to="/inventory" className="btn-primary text-center">Add Item</Link>}
            <Link to="/schedule" className="btn-primary text-center">Add Shift</Link>
            <Link to="/checklists" className="btn-secondary text-center">Checklists</Link>
            <Link to="/timeoff" className="btn-secondary text-center">Time Off</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
