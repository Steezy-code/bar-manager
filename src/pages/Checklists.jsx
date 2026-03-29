import { useState, useEffect } from 'react'
import { CheckCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'barmanager_checklists'

const defaultTasks = {
  opening: [{id:1,t:'Check walk-in temps',c:false},{id:2,t:'Count drawer cash',c:false},{id:3,t:'Stock condiments',c:false}],
  closing: [{id:4,t:'Close out register',c:false},{id:5,t:'Check doors secured',c:false}],
  prep: [{id:6,t:'Prep vegetables',c:false},{id:7,t:'Marinate meats',c:false}]
}

export default function Checklists() {
  const [list, setList] = useState('opening')
  const [tasks, setTasks] = useState(defaultTasks)
  const [edit, setEdit] = useState(false)
  const [newT, setNewT] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newL, setNewL] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setTasks(JSON.parse(saved))
  }, [])

  const save = (newTasks) => {
    setTasks(newTasks)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks))
  }

  const toggle = id => {
    const updated = {...tasks, [list]: tasks[list].map(t => t.id === id ? {...t,c:!t.c} : t)}
    save(updated)
  }
  const addT = () => { if(!newT) return; save({...tasks, [list]: [...tasks[list],{id:Date.now(),t:newT,c:false}]}); setNewT('') }
  const delT = id => save({...tasks, [list]: tasks[list].filter(t => t.id !== id)})
  const addL = () => { if(!newL) return; save({...tasks,[newL.toLowerCase()]:[]}); setList(newL.toLowerCase()); setShowNew(false); setNewL('') }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between"><h1 className="text-2xl font-bold">Checklists</h1><button onClick={() => setShowNew(true)} className="btn-secondary">+ New List</button></div>
      <div className="flex gap-2 overflow-x-auto">{Object.keys(tasks).map(t => <button key={t} onClick={() => setList(t)} className={`px-4 py-2 rounded-lg ${list===t?'bg-bar-accent':'bg-bar-card'}`}>{t}</button>)}</div>
      <div className="card">
        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold capitalize">{list}</h2><button onClick={() => setEdit(!edit)} className="btn-secondary text-sm">{edit?'Done':'Edit'}</button></div>
        {edit && <div className="flex gap-2 mb-4"><input value={newT} onChange={e=>setNewT(e.target.value)} className="input flex-1" placeholder="Add task..." onKeyPress={e=>e.key==='Enter'&&addT()} /><button onClick={addT} className="btn-primary"><PlusIcon className="w-4 h-4"/></button></div>}
        <div className="space-y-2">{tasks[list].map(t => (<div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg ${t.c?'bg-green-500/20':'bg-bar-blue'}`}><div onClick={()=>toggle(t.id)} className="flex-1 flex items-center gap-3 cursor-pointer">{t.c?<CheckCircleIcon className="w-6 h-6 text-green-500"/>:<div className="w-6 h-6 rounded-full border-2"/>}<span className={t.c?'line-through text-gray-400':''}>{t.t}</span></div>{edit&&<button onClick={()=>delT(t.id)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button>}</div>))}</div>
        <button onClick={() => save(tasks)} className="btn-primary w-full mt-4">Save</button>
      </div>
      {showNew && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-bar-card p-6 rounded-xl w-full max-w-md"><h2 className="text-xl font-bold mb-4">New List</h2><input value={newL} onChange={e=>setNewL(e.target.value)} className="input mb-4" placeholder="Name..." /><div className="flex gap-2"><button onClick={()=>setShowNew(false)} className="btn-secondary flex-1">Cancel</button><button onClick={addL} className="btn-primary flex-1">Create</button></div></div></div>)}
    </div>
  )
}
