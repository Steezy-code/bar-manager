import { useState, useEffect, useCallback } from 'react'
import { CheckCircleIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useNotifications } from '../components/Notifications'
import Modal from '../components/Modal'
import IconButton from '../components/IconButton'
import { SkeletonList } from '../components/Skeleton'

const defaultTasks = {
  opening: [{id:1,t:'Check walk-in temps',c:false},{id:2,t:'Count drawer cash',c:false},{id:3,t:'Stock condiments',c:false}],
  closing: [{id:4,t:'Close out register',c:false},{id:5,t:'Check doors secured',c:false}],
  prep: [{id:6,t:'Prep vegetables',c:false},{id:7,t:'Marinate meats',c:false}]
}

export default function Checklists() {
  const { user } = useAuth()
  const { hasRole } = usePermissions()
  const { notify, confirmAction } = useNotifications()
  const canOverrideCompletion = hasRole('manager')
  const [list, setList] = useState('opening')
  const [tasks, setTasks] = useState(defaultTasks)
  const [edit, setEdit] = useState(false)
  const [newT, setNewT] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newL, setNewL] = useState('')
  const [loading, setLoading] = useState(true)
  const [profilesList, setProfilesList] = useState([])
  const [checklistMode, setChecklistMode] = useState('team') // 'team' or 'user'

  // Fetch checklists from Supabase
  const fetchChecklists = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // Try team checklist (team_id = 'main') – assumes migration applied
      const { data, error } = await supabase
        .from(TABLES.CHECKLISTS)
        .select('tasks, name, date, user_id')
        .eq('team_id', 'main')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        // If error mentions column "team_id", fall back to user‑based checklist
        if (error.message && error.message.includes('team_id')) {
          console.warn('team_id column not found, falling back to user‑based checklist')
          // Fetch user's personal checklist
          const { data: userData, error: userError } = await supabase
            .from(TABLES.CHECKLISTS)
            .select('tasks, name, date')
            .eq('user_id', user.id)
            .single()
          
          if (userError && userError.code !== 'PGRST116') {
            throw userError
          }
          
          if (userData && userData.tasks) {
            setTasks(userData.tasks)
            setChecklistMode('user')
          } else {
            // No personal checklist, create one
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const { error: insertError } = await supabase
              .from(TABLES.CHECKLISTS)
              .insert([{ 
                user_id: user.id, 
                tasks: defaultTasks,
                name: 'My Checklists',
                date: today
              }])
            if (insertError) throw insertError
            setTasks(defaultTasks)
            setChecklistMode('user')
          }
          return
        } else if (error.code !== 'PGRST116') {
          // Some other error
          throw error
        }
        // PGRST116 = no rows returned, create team checklist
      }
      
      if (data && data.tasks) {
        setTasks(data.tasks)
        setChecklistMode('team')
      } else {
        // No team checklist exists, create one
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { error: insertError } = await supabase
          .from(TABLES.CHECKLISTS)
          .insert([{ 
            team_id: 'main',
            user_id: user.id, // creator
            tasks: defaultTasks,
            name: 'Team Checklists',
            date: today
          }])
        if (insertError) throw insertError
        setTasks(defaultTasks)
        setChecklistMode('team')
      }
    } catch (err) {
      console.error('Error fetching checklists:', err)
      notify('Failed to load checklists from database.', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, notify])

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id, full_name')
        .eq('status', 'approved')
        .order('full_name', { ascending: true })
      if (error) throw error
      setProfilesList(data || [])
    } catch (err) {
      console.error('Error fetching profiles:', err)
    }
  }, [])

  // Save tasks to Supabase (team checklist)
  const save = async (newTasks) => {
    if (!user) return
    setTasks(newTasks)
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const isTeam = checklistMode === 'team'
      const updateData = { 
        user_id: user.id, // last updated by
        tasks: newTasks,
        name: isTeam ? 'Team Checklists' : 'My Checklists',
        date: today
      }
      let query = supabase
        .from(TABLES.CHECKLISTS)
        .update(updateData)
      if (isTeam) {
        query = query.eq('team_id', 'main')
      } else {
        query = query.eq('user_id', user.id)
      }
      const { error } = await query
      if (error) {
        console.error('Supabase save error:', error)
        throw error
      }
    } catch (err) {
      console.error('Error saving checklists:', err)
      notify('Failed to save checklists to database.', 'error')
    }
  }

  useEffect(() => {
    fetchChecklists()
    fetchProfiles()
  }, [fetchChecklists, fetchProfiles])

  const toggle = id => {
    const currentTasks = tasks[list] || []
    const task = currentTasks.find(t => t.id === id)

    if (!task) return

    if (task.c && task.completed_by && task.completed_by !== user?.id && !canOverrideCompletion) {
      notify('Only the person who completed this task or a manager can change it.', 'error')
      return
    }

    const updated = {...tasks, [list]: currentTasks.map(t => {
      if (t.id === id) {
        const newCompleted = !t.c
        if (newCompleted) {
          const completed_by = user?.id || null
          const completed_at = new Date().toISOString()
          return {
            ...t,
            c: true,
            completed_by,
            completed_at
          }
        } else {
          const { completed_by, completed_at, ...rest } = t
          return { ...rest, c: false }
        }
      }
      return t
    })}
    save(updated)
  }
  const addT = () => { 
    if(!newT) return
    const currentTasks = tasks[list] || []
    const updated = {...tasks, [list]: [...currentTasks,{id:crypto.randomUUID(),t:newT,c:false}]}
    save(updated)
    setNewT('')
  }
  const delT = id => {
    const currentTasks = tasks[list] || []
    const updated = {...tasks, [list]: currentTasks.filter(t => t.id !== id)}
    save(updated)
  }
  const addL = () => { 
    if(!newL) return
    const updated = {...tasks, [newL.toLowerCase()]: []}
    save(updated)
    setList(newL.toLowerCase())
    setShowNew(false)
    setNewL('')
  }

  const deleteList = async (listKey) => {
    const confirmed = await confirmAction({
      title: 'Delete checklist?',
      message: `Delete the entire "${listKey}" list?`,
      confirmLabel: 'Delete',
      danger: true
    })
    if (!confirmed) return

    const newTasks = {...tasks}
    delete newTasks[listKey]
    save(newTasks)
    setList(Object.keys(newTasks)[0] || 'opening')
  }

  const printChecklist = () => {
    window.print()
  }

  // Helper functions for name stamps
  const getCompletedByName = (userId) => {
    const profile = profilesList.find(p => p.id === userId)
    return profile ? profile.full_name : 'Unknown'
  }

  const formatCompletedTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    // Show local date/time in a compact format
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Checklists</h1>
        </div>
        <SkeletonList rows={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Checklists</h1>
        <div className="flex gap-2">
          <button onClick={printChecklist} className="btn-secondary">🖨️ Print</button>
          {hasRole('manager') && (
            <button onClick={() => setShowNew(true)} className="btn-secondary">+ New List</button>
          )}
        </div>
      </div>
      {/* Horizontal scroll-snap selector — comfortable taps, no wrap/overflow jank on mobile */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none">
        {Object.keys(tasks).map(t => (
          <div key={t} className="flex shrink-0 snap-start items-stretch">
            <button
              onClick={() => setList(t)}
              className={`min-h-touch rounded-l-lg px-4 font-medium capitalize transition active:scale-[0.97] ${list===t?'bg-bar-accent text-white':'bg-bar-card text-gray-300'} ${!(Object.keys(tasks).length > 1 && hasRole('manager')) ? 'rounded-r-lg' : ''}`}
            >
              {t}
            </button>
            {Object.keys(tasks).length > 1 && hasRole('manager') && (
              <button
                onClick={() => deleteList(t)}
                aria-label={`Delete ${t} list`}
                className="flex min-h-touch items-center rounded-r-lg bg-red-600 px-3 text-white hover:bg-red-500 active:scale-95"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize">{list}</h2>
          {hasRole('manager') && (
            <button onClick={() => setEdit(!edit)} className="btn-secondary text-sm">
              {edit?'Done':'Edit'}
            </button>
          )}
        </div>
        {edit && (
          <div className="flex gap-2 mb-4">
            <input 
              value={newT} 
              onChange={e => setNewT(e.target.value)} 
              className="input flex-1" 
              placeholder="Add task..." 
              onKeyDown={e => e.key === 'Enter' && addT()}
            />
            <button onClick={addT} className="btn-primary" aria-label="Add task">
              <PlusIcon className="w-5 h-5"/>
            </button>
          </div>
        )}
        <div className="space-y-2">
          {(tasks[list] || []).map(t => (
            <div 
              key={t.id} 
              className={`checklist-item flex items-center gap-3 p-3 rounded-lg ${t.c?'bg-green-500/20':'bg-bar-blue'}`}
            >
              <div onClick={() => toggle(t.id)} className={`flex-1 ${t.c && t.completed_by && t.completed_by !== user?.id && !canOverrideCompletion ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <div className="flex items-center gap-3">
                  {t.c ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-500"/>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2"/>
                  )}
                  <span className={t.c?'line-through text-gray-400':''}>{t.t}</span>
                </div>
                {t.c && (t.completed_by || t.completed_at) && (
                  <div className="text-xs text-gray-400 mt-1 ml-9">
                    Completed by {getCompletedByName(t.completed_by)} on {formatCompletedTime(t.completed_at)}
                    {t.completed_by && t.completed_by !== user?.id && !canOverrideCompletion ? ' · Locked to original completer' : ''}
                  </div>
                )}
              </div>
              {edit && (
                <IconButton icon={TrashIcon} label="Delete task" tone="danger" onClick={() => delT(t.id)} />
              )}
            </div>
          ))}
        </div>
        <button onClick={() => save(tasks)} className="btn-primary w-full mt-4">Save</button>
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New List">
        <input
          value={newL}
          onChange={e => setNewL(e.target.value)}
          className="input mb-4"
          placeholder="Name…"
          onKeyDown={e => e.key === 'Enter' && addL()}
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={addL} className="btn-primary flex-1">Create</button>
        </div>
      </Modal>
    </div>
  )
}
