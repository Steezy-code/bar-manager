import { useState, useRef } from 'react'

export default function Settings() {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  // Export all data
  const exportData = () => {
    // Gather data from various localStorage keys
    const data = {
      inventory: JSON.parse(localStorage.getItem('barmanager_inventory') || '[]'),
      checklists: JSON.parse(localStorage.getItem('barmanager_checklists') || '[]'),
      timeoff: JSON.parse(localStorage.getItem('barmanager_timeoff') || '[]'),
      schedule: JSON.parse(localStorage.getItem('barmanager_schedule') || '[]'),
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barmanager-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    setMsg('✅ Data exported successfully!')
    setTimeout(() => setMsg(''), 3000)
  }

  // Import data
  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        
        if (data.inventory) {
          localStorage.setItem('barmanager_inventory', JSON.stringify(data.inventory))
        }
        if (data.checklists) {
          localStorage.setItem('barmanager_checklists', JSON.stringify(data.checklists))
        }
        if (data.timeoff) {
          localStorage.setItem('barmanager_timeoff', JSON.stringify(data.timeoff))
        }
        if (data.schedule) {
          localStorage.setItem('barmanager_schedule', JSON.stringify(data.schedule))
        }
        
        setMsg('✅ Data imported! Refresh the page to see changes.')
        setTimeout(() => setMsg(''), 5000)
      } catch (err) {
        setMsg('❌ Error: Invalid file format')
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
        <h2 className="text-lg font-bold mb-4">📤 Export Data</h2>
        <p className="text-gray-400 text-sm mb-4">
          Download all your inventory, checklists, time off, and schedule data as a JSON file.
        </p>
        <button onClick={exportData} className="btn-primary w-full">
          📥 Export All Data
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">📥 Import Data</h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload a previously exported JSON file to load all data. This will replace your current data.
        </p>
        <input 
          type="file" 
          accept=".json" 
          ref={fileRef}
          onChange={importData}
          className="hidden" 
        />
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
        <h2 className="text-lg font-bold mb-4">ℹ️ How to Share Data</h2>
        <ol className="text-gray-400 text-sm space-y-2">
          <li>1. Manager fills out inventory, checklists, etc.</li>
          <li>2. Click "Export All Data" to download JSON</li>
          <li>3. Send the JSON file to staff (Discord, email, etc.)</li>
          <li>4. Staff clicks "Import Data" and uploads the file</li>
          <li>5. Everyone has the same data!</li>
        </ol>
      </div>
    </div>
  )
}
