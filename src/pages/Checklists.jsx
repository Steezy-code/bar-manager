import { useState, useEffect, useCallback } from 'react'
import { CheckCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

const defaultTasks = {
  opening: [{id:1,t:'Check walk-in temps',c:false},{id:2,t:'Count drawer cash',c:false},{id:3,t:'Stock condiments',c:false}],
  closing: [{id:4,t:'Close out register',c:false},{id:5,t:'Check doors secured',c:false}],
  prep: [{id:6,t:'Prep vegetables',c:false},{id:7,t:'Marinate meats',c:false}]
}

export default function Checklists() {
  const { user } = useAuth()
  const { hasRole } = usePermissions()
  const [list, setList] = useState('opening')
  const [tasks, setTasks] = useState(defaultTasks)
  const [edit, setEdit] = useState(false)
  const [newT, setNewT] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newL, setNewL] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch checklists from Supabase
  const fetchChecklists = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.CHECKLISTS)
        .select('tasks, name, date')
        .eq('user_id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }
      
      if (data && data.tasks) {
        setTasks(data.tasks)
      } else {
        // No existing data, create default row with required columns
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
      }
    } catch (err) {
      console.error('Error fetching checklists:', err)
      alert('Failed to load checklists from database.')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Save tasks to Supabase
  const save = async (newTasks) => {
    if (!user) return
    setTasks(newTasks)
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { error } = await supabase
        .from(TABLES.CHECKLISTS)
        .upsert({ 
          user_id: user.id, 
          tasks: newTasks,
          name: 'My Checklists',
          date: today
        }, { onConflict: 'user_id' })
      if (error) throw error
    } catch (err) {
      console.error('Error saving checklists:', err)
      alert('Failed to save checklists to database.')
    }
  }

  useEffect(() => {
    fetchChecklists()
  }, [fetchChecklists])

  const toggle = id => {
    const updated = {...tasks, [list]: tasks[list].map(t => t.id === id ? {...t,c:!t.c} : t)}
    save(updated)
  }
  const addT = () => { 
    if(!newT) return
    const updated = {...tasks, [list]: [...tasks[list],{id:Date.now(),t:newT,c:false}]}
    save(updated)
    setNewT('')
  }
  const delT = id => {
    const updated = {...tasks, [list]: tasks[list].filter(t => t.id !== id)}
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

  const deleteList = (listKey) => {
    if (confirm('Delete entire "' + listKey + '" list?')) {
      const newTasks = {...tasks}
      delete newTasks[listKey]
      save(newTasks)
      setList(Object.keys(newTasks)[0] || 'opening')
    }
  }

  const printChecklist = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Checklists</h1>
        </div>
        <div className="card">
          <div className="text-gray-400">Loading checklists...</div>
        </div>
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
      <div className="flex gap-2 overflow-x-auto flex-wrap">
        {Object.keys(tasks).map(t => (
          <div key={t} className="flex items-center">
            <button 
              onClick={() => setList(t)} 
              className={`px-4 py-2 rounded-l-lg ${list===t?'bg-bar-accent':'bg-bar-card'}`}
            >
              {t}
            </button>
            {Object.keys(tasks).length > 1 && hasRole('manager') && (
              <button 
                onClick={() => deleteList(t)} 
                className="px-2 py-2 rounded-r-lg bg-red-600 text-white hover:bg-red-500"
              >
                ×
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
              onKeyPress={e => e.key === 'Enter' && addT()} 
            />
            <button onClick={addT} className="btn-primary">
              <PlusIcon className="w-4 h-4"/>
            </button>
          </div>
        )}
        <div className="space-y-2">
          {(tasks[list] || []).map(t => (
            <div 
              key={t.id} 
              className={`checklist-item flex items-center gap-3 p-3 rounded-lg ${t.c?'bg-green-500/20':'bg-bar-blue'}`}
            >
              <div onClick={() => toggle(t.id)} className="flex-1 flex items-center gap-3 cursor-pointer">
                {t.c ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-500"/>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2"/>
                )}
                <span className={t.c?'line-through text-gray-400':''}>{t.t}</span>
              </div>
              {edit && (
                <button onClick={() => delT(t.id)} className="text-red-500">
                  <TrashIcon className="w-4 h-4"/>
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => save(tasks)} className="btn-primary w-full mt-4">Save</button>
      </div>
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">New List</h2>
            <input 
              value={newL} 
              onChange={e => setNewL(e.target.value)} 
              className="input mb-4" 
              placeholder="Name..." 
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={addL} className="btn-primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}