import { useEffect, useState } from 'react'
import { supabase, TABLES } from '../lib/supabase'
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const roles = ['all', 'manager', 'bartender', 'server', 'cook', 'host']

export default function Schedule() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [showModal, setShowModal] = useState(false)
  const [newShift, setNewShift] = useState({
    user_id: '',
    date: '',
    start_time: '16:00',
    end_time: '23:00',
    role: 'server'
  })

  function getMonday(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  useEffect(() => {
    loadShifts()
  }, [weekStart])

  const loadShifts = async () => {
    try {
      const startDate = weekStart.toISOString().split('T')[0]
      const endDate = new Date(weekStart.getTime() + 6 * 86400000).toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from(TABLES.SHIFTS)
        .select('*, profiles(full_name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
      
      if (error) throw error
      setShifts(data || [])
    } catch (err) {
      console.error('Error loading shifts:', err)
    } finally {
      setLoading(false)
    }
  }

  const addShift = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from(TABLES.SHIFTS)
        .insert([newShift])
      
      if (error) throw error
      setShowModal(false)
      setNewShift({ user_id: '', date: '', start_time: '16:00', end_time: '23:00', role: 'server' })
      loadShifts()
    } catch (err) {
      alert('Error adding shift: ' + err.message)
    }
  }

  const getDaysOfWeek = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * 86400000)
      days.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate()
      })
    }
    return days
  }

  const prevWeek = () => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))
  const nextWeek = () => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))

  const days = getDaysOfWeek()

  if (loading) return <div className="text-center py-20">Loading schedule...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-gray-400">Manage staff shifts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Shift
        </button>
      </div>

      {/* Week Navigation */}
      <div className="card flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 hover:bg-bar-blue rounded-lg">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">
          {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
          {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <button onClick={nextWeek} className="p-2 hover:bg-bar-blue rounded-lg">
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => (
          <div key={day.dateStr} className="min-h-[200px]">
            <div className="text-center p-2 bg-bar-card rounded-t-lg">
              <div className="text-sm text-gray-400">{day.dayName}</div>
              <div className="font-bold">{day.dayNum}</div>
            </div>
            <div className="space-y-2 mt-2">
              {shifts
                .filter(s => s.date === day.dateStr)
                .map(shift => (
                  <div key={shift.id} className="bg-bar-blue p-2 rounded-lg text-xs">
                    <div className="font-semibold">{shift.profiles?.full_name || 'Staff'}</div>
                    <div className="text-gray-400">{shift.start_time} - {shift.end_time}</div>
                    <div className="text-bar-accent capitalize">{shift.role}</div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Shift</h2>
            <form onSubmit={addShift} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift({...newShift, date: e.target.value})}
                  className="input"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newShift.start_time}
                    onChange={(e) => setNewShift({...newShift, start_time: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newShift.end_time}
                    onChange={(e) => setNewShift({...newShift, end_time: e.target.value})}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select
                  value={newShift.role}
                  onChange={(e) => setNewShift({...newShift, role: e.target.value})}
                  className="input"
                >
                  <option value="server">Server</option>
                  <option value="bartender">Bartender</option>
                  <option value="cook">Cook</option>
                  <option value="host">Host</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Add Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
