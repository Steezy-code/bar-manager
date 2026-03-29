import { useEffect, useState } from 'react'
import { supabase, TABLES } from '../lib/supabase'
import { PlusIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

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

const checklistTypes = ['opening', 'closing', 'prep']

export default function Checklists() {
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('opening')
  const [currentTasks, setCurrentTasks] = useState(defaultTasks[activeType])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadChecklists()
  }, [])

  useEffect(() => {
    setCurrentTasks(defaultTasks[activeType])
  }, [activeType])

  const loadChecklists = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.CHECKLISTS)
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
        .from(TABLES.CHECKLISTS)
        .insert([{
          name: activeType,
          date: today,
          tasks: currentTasks,
          completed_at: new Date().toISOString()
        }])
      
      if (error) throw error
      alert(`${activeType.charAt(0).toUpperCase() + activeType.slice(1)} checklist saved!`)
      loadChecklists()
      setCurrentTasks(defaultTasks[activeType].map(t => ({ ...t, checked: false })))
    } catch (err) {
      alert('Error saving checklist: ' + err.message)
    }
  }

  const toggleTask = (id) => {
    setCurrentTasks(tasks => 
      tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t)
    )
  }

  const completedCount = currentTasks.filter(t => t.checked).length
  const totalCount = currentTasks.length

  if (loading) return <div className="text-center py-20">Loading checklists...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Checklists</h1>
        <p className="text-gray-400">Daily tasks for your team</p>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {checklistTypes.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-lg capitalize whitespace-nowrap ${
              activeType === type ? 'bg-bar-accent text-white' : 'bg-bar-card text-gray-400 hover:text-white'
            }`}
          >
            {type} Checklist
          </button>
        ))}
      </div>

      {/* Current Checklist */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold capitalize">{activeType} Checklist</h2>
          <span className="text-gray-400">
            {completedCount}/{totalCount} complete
          </span>
        </div>

        <div className="space-y-3">
          {currentTasks.map(task => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition ${
                task.checked ? 'bg-green-500/20 border border-green-500/50' : 'bg-bar-blue hover:bg-blue-700'
              }`}
            >
              {task.checked ? (
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-500" />
              )}
              <span className={task.checked ? 'line-through text-gray-400' : ''}>
                {task.text}
              </span>
            </div>
          ))}
        </div>

        <button onClick={saveChecklist} className="btn-primary w-full mt-6">
          Save {activeType} Checklist
        </button>
      </div>

      {/* History Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="text-bar-accent hover:underline"
      >
        {showHistory ? 'Hide History' : 'View Completed Checklists'}
      </button>

      {showHistory && checklists.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Recent Checklists</h3>
          {checklists.map(cl => (
            <div key={cl.id} className="card">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold capitalize">{cl.name}</span>
                  <span className="text-gray-400 ml-2">
                    {new Date(cl.date).toLocaleDateString()}
                  </span>
                </div>
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
