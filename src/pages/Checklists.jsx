import { useState } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function Checklists({ user }) {
  const [activeType, setActiveType] = useState('opening')
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Check walk-in temperatures', checked: false },
    { id: 2, text: 'Count drawer cash', checked: false },
    { id: 3, text: 'Stock condiments', checked: false },
  ])

  const toggle = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t))

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div><h1 className="text-2xl font-bold">Checklists</h1><p className="text-gray-400">Daily tasks</p></div>
      <div className="flex gap-2 overflow-x-auto">
        {['opening', 'closing', 'prep'].map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-lg ${activeType === type ? 'bg-bar-accent' : 'bg-bar-card'}`}>
            {type}
          </button>
        ))}
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 capitalize">{activeType} Checklist</h2>
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} onClick={() => toggle(task.id)}
              className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer ${task.checked ? 'bg-green-500/20' : 'bg-bar-blue'}`}>
              {task.checked ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <div className="w-6 h-6 rounded-full border-2" />}
              <span className={task.checked ? 'line-through text-gray-400' : ''}>{task.text}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary w-full mt-6">Save Checklist</button>
      </div>
    </div>
  )
}
