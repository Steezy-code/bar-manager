import { useState, useEffect, useCallback } from 'react'
import { TrashIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useNotifications } from '../components/Notifications'
import Modal from '../components/Modal'
import IconButton from '../components/IconButton'
import { SkeletonList } from '../components/Skeleton'
import { useAppRefresh } from '../hooks/usePullToRefresh'

const getEmptyRequest = (profile) => ({
  name: profile?.full_name || '',
  staffId: profile?.id || '',
  dates: '',
  days: '',
  month: new Date().getMonth(),
  year: new Date().getFullYear()
})

export default function TimeOff() {
  const { user, profile } = useAuth()
  const { hasRole, isApproved } = usePermissions()
  const { notify, confirmAction } = useNotifications()
  const canManageRequests = hasRole('manager')
  const [approved, setApproved] = useState([])
  const [pending, setPending] = useState([])
  const [profilesList, setProfilesList] = useState([])
  const [profilesUnavailable, setProfilesUnavailable] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newTimeOff, setNewTimeOff] = useState(() => getEmptyRequest(profile))
  const [loading, setLoading] = useState(true)
  const [monthIsOneIndexed, setMonthIsOneIndexed] = useState(false)

  const fetchTimeOff = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.TIME_OFF)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const hasOneIndexed = data && data.some(r => r.month > 11)
      setMonthIsOneIndexed(hasOneIndexed)
      if (hasOneIndexed) {
        console.warn('Detected 1-indexed months in time-off requests; apply migration 20260408040000_fix_time_off_month_index.sql.')
      }

      setPending((data || []).filter(r => r.status === 'pending'))
      setApproved((data || []).filter(r => r.status === 'approved'))
    } catch (err) {
      console.error('Error fetching time off requests:', err)
      notify('Failed to load time off requests from database.', 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id, full_name, email, role, status')
        .eq('status', 'approved')
        .order('full_name', { ascending: true })
      if (error) throw error
      setProfilesList(data || [])
      setProfilesUnavailable(false)
    } catch (err) {
      console.warn('Approved profile list unavailable; falling back to typed names.', err)
      setProfilesList([])
      setProfilesUnavailable(true)
    }
  }, [])

  useEffect(() => {
    fetchTimeOff()
    fetchProfiles()
  }, [fetchTimeOff, fetchProfiles])

  useAppRefresh(fetchTimeOff)

  const addPending = async (e) => {
    e.preventDefault()
    if (!user) {
      notify('You must be logged in to add a request.', 'error')
      return
    }

    const selectedProfile = profilesList.find(p => p.id === newTimeOff.staffId)
    const requestName = selectedProfile?.full_name || selectedProfile?.email || newTimeOff.name.trim()

    if (!requestName) {
      notify('Choose or enter a staff name.', 'error')
      return
    }

    const monthToStore = monthIsOneIndexed ? Number(newTimeOff.month) + 1 : Number(newTimeOff.month)
    const requestToInsert = {
      name: requestName,
      dates: newTimeOff.dates.trim(),
      days: newTimeOff.days.trim(),
      status: 'pending',
      month: monthToStore,
      year: Number(newTimeOff.year),
      user_id: user.id
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.TIME_OFF)
        .insert([requestToInsert])
        .select('*')
      if (error) throw error

      setPending(current => [data[0], ...current])
      setShowAdd(false)
      setNewTimeOff(getEmptyRequest(profile))
      notify('Time off request added.', 'success')
    } catch (err) {
      console.error('Error adding time off request:', err)
      notify('Failed to add request to database.', 'error')
    }
  }

  const approveRequest = async (request) => {
    if (!canManageRequests) {
      notify('Only managers can approve time off requests.', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from(TABLES.TIME_OFF)
        .update({ status: 'approved' })
        .eq('id', request.id)
      if (error) throw error

      setPending(current => current.filter(p => p.id !== request.id))
      setApproved(current => [{ ...request, status: 'approved' }, ...current])
      notify('Request approved.', 'success')
    } catch (err) {
      console.error('Error approving request:', err)
      notify('Failed to approve request in database.', 'error')
    }
  }

  const denyRequest = async (request) => {
    if (!canManageRequests) {
      notify('Only managers can deny time off requests.', 'error')
      return
    }

    const confirmed = await confirmAction({
      title: 'Deny time off request?',
      message: `Deny ${request.name}'s request for ${request.dates}?`,
      confirmLabel: 'Deny',
      danger: true
    })
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from(TABLES.TIME_OFF)
        .delete()
        .eq('id', request.id)
      if (error) throw error

      setPending(current => current.filter(p => p.id !== request.id))
      notify('Request denied.', 'success')
    } catch (err) {
      console.error('Error denying request:', err)
      notify('Failed to deny request in database.', 'error')
    }
  }

  const removeApproved = async (request) => {
    if (!canManageRequests) {
      notify('Only managers can remove approved time off.', 'error')
      return
    }

    const confirmed = await confirmAction({
      title: 'Remove approved time off?',
      message: `Remove ${request.name}'s approved time off for ${request.dates}?`,
      confirmLabel: 'Remove',
      danger: true
    })
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from(TABLES.TIME_OFF)
        .delete()
        .eq('id', request.id)
      if (error) throw error

      setApproved(current => current.filter(t => t.id !== request.id))
      notify('Approved time off removed.', 'success')
    } catch (err) {
      console.error('Error removing approved request:', err)
      notify('Failed to remove request from database.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <div>
          <h1 className="text-2xl font-bold">Time Off</h1>
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
        <SkeletonList rows={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Time Off</h1>
          <p className="text-sm text-gray-400">
            {canManageRequests ? 'Review requests, then approve to add them to the schedule.' : 'Submit requests and view approved time off.'}
          </p>
        </div>
        {isApproved && (
          <button onClick={() => setShowAdd(true)} className="btn-primary self-start">
            <PlusIcon className="h-5 w-5" /> Add Request
          </button>
        )}
      </div>

      {profilesUnavailable && (
        <div className="card border-yellow-500 bg-yellow-500/10 text-sm text-yellow-100">
          Staff list is unavailable, so requests can still be entered by name.
        </div>
      )}

      {pending.length > 0 && (
        <div className="card border border-yellow-500 bg-yellow-500/20">
          <h2 className="mb-4 text-lg font-bold text-yellow-400">Pending Requests ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(t => (
              <div key={t.id} className="flex flex-col gap-3 rounded-lg border border-yellow-500 bg-bar-card p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.dates} (Days: {t.days})</div>
                </div>
                {canManageRequests ? (
                  <div className="flex gap-2">
                    <button onClick={() => approveRequest(t)} className="flex min-h-touch flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 font-semibold text-white hover:bg-green-500 active:scale-[0.97] md:flex-none">
                      <CheckIcon className="h-5 w-5" /> Approve
                    </button>
                    <button onClick={() => denyRequest(t)} className="flex min-h-touch flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-3 font-semibold text-white hover:bg-red-500 active:scale-[0.97] md:flex-none">
                      <XMarkIcon className="h-5 w-5" /> Deny
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Manager approval required</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-4 text-lg font-bold">Approved ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="text-gray-400">No time off scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {approved.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-bar-blue p-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.dates} (Days: {t.days})</div>
                </div>
                {canManageRequests ? (
                  <IconButton icon={TrashIcon} label={`Remove time off for ${t.name}`} tone="danger" onClick={() => removeApproved(t)} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Time Off Request">
          <form onSubmit={addPending} className="space-y-3">
            {profilesList.length > 0 ? (
              <select
                className="input"
                value={newTimeOff.staffId}
                onChange={e => {
                  const selected = profilesList.find(p => p.id === e.target.value)
                  setNewTimeOff({ ...newTimeOff, staffId: e.target.value, name: selected?.full_name || '' })
                }}
                required
              >
                <option value="">Select staff...</option>
                {profilesList.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.role})</option>
                ))}
              </select>
            ) : (
              <input placeholder="Staff name" className="input" value={newTimeOff.name} onChange={e => setNewTimeOff({ ...newTimeOff, name: e.target.value })} required />
            )}
            <input placeholder="Dates (e.g., March 15-17)" className="input" value={newTimeOff.dates} onChange={e => setNewTimeOff({ ...newTimeOff, dates: e.target.value })} required />
            <input placeholder="Day numbers (e.g., 15,16,17)" className="input" value={newTimeOff.days} onChange={e => setNewTimeOff({ ...newTimeOff, days: e.target.value })} required />
            <div className="flex gap-2">
              <select className="input flex-1" value={Number(newTimeOff.month) + 1} onChange={e => setNewTimeOff({ ...newTimeOff, month: parseInt(e.target.value, 10) - 1 })}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
              <select className="input flex-1" value={newTimeOff.year} onChange={e => setNewTimeOff({ ...newTimeOff, year: parseInt(e.target.value, 10) })}>
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
            <p className="text-xs text-gray-400">Request goes to the queue. Managers approve it before it appears on the schedule.</p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add to Queue</button>
            </div>
          </form>
      </Modal>
    </div>
  )
}
