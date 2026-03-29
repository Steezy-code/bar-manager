import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PlusIcon, CheckCircleIcon, TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'

const defaultTasks = {
  opening: [
    { id: 1, text: 'Check walk-in temperatures', checked: false },
    { id: 2, text: 'Count drawer cash', checked: false },
    { id: 3, text: 'Stock condiments and napkins', checked: false },
    { id: 4, text: 'Test POS system', checked: false },
    { id: 5, text: 'Review reservations', checked: false },
    { id: 6, text: 'Set out menu boards', checked: false },
  ],
  closing: [
    { id: 1, text: 'Close out register', checked: false },
    { id: 2, text: 'Check all doors secured', checked: false },
    { id: 3, text: 'Turn off equipment', checked: false },
    { id: 4, text: 'Restock for tomorrow', checked: false },
    { id: 5, text: 'Clean coffee maker', checked: false },
  ],
  prep: [
    { id: 1, text: 'Prep vegetables', checked: false },
    { id: 2, text: 'Marinate meats', checked: false },
    { id: 3, text: 'Make sauces', checked: false },
    { id: 4, text: 'Stock ice bins', checked: false },
  ]
}

export default function Checklists() {
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('opening')
  const [currentTasks, setCurrentTasks] = useState(defaultTasks[activeType])
  const [showHistory, setShowHistory] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')

  useEffect(() => {
    loadChecklists()
  }, [])

  useEffect(() => {
    if (defaultTasks[activeType]) {
      setCurrentTasks(defaultTasks[activeType])
    }
    setEditMode(false)
  }, [activeType])

  const loadChecklists = async () => {
    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setChecklists(data || [])
    } catch (err) {
      console.error('Error loading checklists:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveChecklist = async () => {
    const today = new Date().toISOString().split('T')[0]
    try {
      const { error } = await supabase
        .from('checklists')
        .insert([{
          name: activeType,
          date: today,
          tasks: currentTasks,
          completed_at: new Date().toISOString()
        }])
      
      if (error) throw error
      alert(`${activeType.charAt(0).toUpperCase() + activeType.slice(1)} checklist saved!`)
      loadChecklists()
      const resetTasks = currentTasks.map(t => ({ ...t, checked: false }))
      defaultTasks[activeType] = resetTasks
      setCurrentTasks(resetTasks)
      setEditMode(false)
    } catch (err) {
      alert('Error saving checklist: ' + err.message)
    }
  }

  const toggleTask = (id) => {
    setCurrentTasks(tasks => 
      tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t)
    )
    // Update default tasks too
    const updated = currentTasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t)
    defaultTasks[activeType] = updated
  }

  const addTask = () => {
    if (!newTaskText.trim()) return
    const newTask = { id: Date.now(), text: newTaskText.trim(), checked: false }
    const updated = [...currentTasks, newTask]
    setCurrentTasks(updated)
    defaultTasks[activeType] = updated
    setNewTaskText('')
  }

  const deleteTask = (id) => {
    const updated = currentTasks.filter(t => t.id !== id)
    setCurrentTasks(updated)
    defaultTasks[activeType] = updated
  }

  const createNewList = () => {
    if (!newListName.trim()) return
    const key = newListName.toLowerCase().trim()
    defaultTasks[key] = []
    setActiveType(key)
    setCurrentTasks([])
    setShowNewList(false)
    setNewListName('')
  }

  const completedCount = currentTasks.filter(t => t.checked).length
  const totalCount = currentTasks.length
  const allLists = Object.keys(defaultTasks)

  if (loading) return <div className="text-center py-20">Loading checklists...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Checklists</h1>
        <p className="text-gray-400">Daily tasks for your team</p>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2 overflow-x-auto flex-1">
          {allLists.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-lg capitalize whitespace-nowrap ${
                activeType === type ? 'bg-bar-accent text-white' : 'bg-bar-card text-gray-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNewList(true)} className="btn-secondary text-sm ml-2">
          + New List
        </button>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold capitalize">{activeType} Checklist</h2>
          <span className="text-gray-400">{completedCount}/{totalCount} complete</span>
        </div>

        <button onClick={() => setEditMode(!editMode)} className="btn-secondary text-sm mb-4">
          {editMode ? 'Done Editing' : 'Edit Tasks'}
        </button>

        {editMode && (
          <div className="flex gap-2 mb-4">
            <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} 
              placeholder="Add new task..." className="input flex-1" 
              onKeyPress={(e) => e.key === 'Enter' && addTask()} />
            <button onClick={addTask} className="btn-primary">Add</button>
          </div>
        )}

        <div className="space-y-3">
          {currentTasks.map(task => (
            <div key={task.id} className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition ${
              task.checked ? 'bg-green-500/20 border border-green-500/50' : 'bg-bar-blue hover:bg-blue-700'
            }`}>
              <div onClick={() => toggleTask(task.id)} className="flex-1 flex items-center gap-3">
                {task.checked ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> 
                  : <div className="w-6 h-6 rounded-full border-2 border-gray-500" />}
                <span className={task.checked ? 'line-through text-gray-400' : ''}>{task.text}</span>
              </div>
              {editMode && <button onClick={() => deleteTask(task.id)} className="p-2 text-red-500"><TrashIcon className="w-4 h-4" /></button>}
            </div>
          ))}
          {currentTasks.length === 0 && <p className="text-gray-400">No tasks yet. Add some in edit mode!</p>}
        </div>

        <button onClick={saveChecklist} className="btn-primary w-full mt-6">
          Save {activeType} Checklist
        </button>
      </div>

      {showHistory && checklists.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Recent Checklists</h3>
          {checklists.map(cl => (
            <div key={cl.id} className="card">
              <div className="flex justify-between items-center">
                <div><span className="font-semibold capitalize">{cl.name}</span>
                <span className="text-gray-400 ml-2">{new Date(cl.date).toLocaleDateString()}</span></div>
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showHistory && <button onClick={() => setShowHistory(false)} className="text-bar-accent">Hide History</button>}
      {!showHistory && <button onClick={() => setShowHistory(true)} className="text-bar-accent">View History</button>}

      {showNewList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Checklist</h2>
            <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name (e.g., cleaning)" className="input mb-4"
              onKeyPress={(e) => e.key === 'Enter' && createNewList()} />
            <div className="flex gap-3">
              <button onClick={() => setShowNewList(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={createNewList} className="btn-primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
