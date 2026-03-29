import { useState, useRef } from 'react'

export default function Settings() {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  const exportData = () => {
    const data = {
      inventory: JSON.parse(localStorage.getItem('barmanager_inventory') || '[]'),
      checklists: JSON.parse(localStorage.getItem('barmanager_checklists') || '[]'),
      timeoff: JSON.parse(localStorage.getItem('barmanager_timeoff') || '[]'),
      timeoff_pending: JSON.parse(localStorage.getItem('barmanager_timeoff_pending') || '[]'),
      schedule: JSON.parse(localStorage.getItem('barmanager_schedule') || '[]'),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barmanager-full-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    setMsg('✅ All data exported (Inventory, Checklists, Schedule, Time Off + Pending)!')
    setTimeout(() => setMsg(''), 4000)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        let imported = 0
        
        if (data.inventory) {
          localStorage.setItem('barmanager_inventory', JSON.stringify(data.inventory))
          imported++
        }
        if (data.checklists) {
          localStorage.setItem('barmanager_checklists', JSON.stringify(data.checklists))
          imported++
        }
        if (data.timeoff) {
          localStorage.setItem('barmanager_timeoff', JSON.stringify(data.timeoff))
          imported++
        }
        if (data.schedule) {
          localStorage.setItem('barmanager_schedule', JSON.stringify(data.schedule))
          imported++
        }
        if (data.timeoff_pending) {
          localStorage.setItem('barmanager_timeoff_pending', JSON.stringify(data.timeoff_pending))
          imported++
        }
        
        setMsg(`✅ Imported ${imported} sections! Refresh to see all data.`)
        setTimeout(() => setMsg(''), 5000)
      } catch (err) {
        setMsg('❌ Invalid file')
        setTimeout(() => setMsg(''), 3000)
      }
    }
    reader.readAsText(file)
    fileRef.current.value = ''
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <div className="card">
        <h2 className="text-lg font-bold mb-4">📤 Export All Data</h2>
        <p className="text-gray-400 text-sm mb-4">
          Downloads EVERYTHING: Inventory, Checklists, Schedule, and Time Off
        </p>
        <button onClick={exportData} className="btn-primary w-full">
          📥 Export Full Data
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">📥 Import Data</h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload a previously exported JSON file to load all data
        </p>
        <input type="file" accept=".json" ref={fileRef} onChange={importData} className="hidden" />
        <button onClick={() => fileRef.current.click()} className="btn-secondary w-full">
          📤 Import Data
        </button>
      </div>

      {msg && (
        <div className="card bg-green-500/20 border border-green-500">
          <p className="text-green-400">{msg}</p>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-bold mb-4">ℹ️ Sharing Workflow</h2>
        <ol className="text-gray-400 text-sm space-y-2">
          <li>1. Manager fills out all sections (inventory, schedule, time off, checklists)</li>
          <li>2. Click "Export Full Data" → downloads JSON</li>
          <li>3. Send the JSON file to staff</li>
          <li>4. Staff opens app → Settings → Import Data</li>
          <li>5. Everyone has identical, synced data!</li>
        </ol>
      </div>
    </div>
  )
}
