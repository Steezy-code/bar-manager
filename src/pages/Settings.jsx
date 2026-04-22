import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'

export default function Settings() {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  const exportData = async () => {
    try {
      // Fetch all data from Supabase tables
      const [inventoryRes, shiftsRes, checklistsRes, timeOffRes] = await Promise.all([
        supabase.from(TABLES.INVENTORY).select('*'),
        supabase.from(TABLES.SHIFTS).select('*'),
        supabase.from(TABLES.CHECKLISTS).select('*'),
        supabase.from(TABLES.TIME_OFF).select('*')
      ])

      if (inventoryRes.error) throw inventoryRes.error
      if (shiftsRes.error) throw shiftsRes.error
      if (checklistsRes.error) throw checklistsRes.error
      if (timeOffRes.error) throw timeOffRes.error

      const data = {
        inventory: inventoryRes.data,
        shifts: shiftsRes.data,
        checklists: checklistsRes.data,
        time_off: timeOffRes.data.filter(r => r.status === 'approved'),
        time_off_pending: timeOffRes.data.filter(r => r.status === 'pending'),
        exportedAt: new Date().toISOString(),
        version: '2.0'
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `barmanager-full-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      
      setMsg('✅ All data exported from Supabase (Inventory, Shifts, Checklists, Time Off)!')
      setTimeout(() => setMsg(''), 4000)
    } catch (err) {
      console.error('Export error:', err)
      setMsg('❌ Failed to export data')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const importData = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        let imported = 0
        
        // Validate version (1.0 = localStorage, 2.0 = Supabase)
        const isV1 = data.version === '1.0'
        const isV2 = data.version === '2.0'
        
        if (!isV1 && !isV2) {
          alert('Unknown export version. Please use a file exported from this app.')
          return
        }

        if (!confirm(`This will replace ALL data in the database with the imported file. Continue?`)) {
          return
        }

        // Clear existing data (delete all rows from each table)
        // Note: This is a destructive operation. In a real app, you'd want to be more careful.
        const clearPromises = [
          supabase.from(TABLES.INVENTORY).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from(TABLES.SHIFTS).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from(TABLES.CHECKLISTS).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from(TABLES.TIME_OFF).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        ]
        await Promise.all(clearPromises)

        // Insert new data
        if (data.inventory && Array.isArray(data.inventory)) {
          const { error } = await supabase.from(TABLES.INVENTORY).insert(data.inventory)
          if (error) throw error
          imported++
        }
        if (data.shifts && Array.isArray(data.shifts)) {
          const { error } = await supabase.from(TABLES.SHIFTS).insert(data.shifts)
          if (error) throw error
          imported++
        }
        if (data.checklists && Array.isArray(data.checklists)) {
          const { error } = await supabase.from(TABLES.CHECKLISTS).insert(data.checklists)
          if (error) throw error
          imported++
        }
        if (data.time_off && Array.isArray(data.time_off)) {
          const timeOffWithStatus = data.time_off.map(r => ({ ...r, status: 'approved' }))
          const { error } = await supabase.from(TABLES.TIME_OFF).insert(timeOffWithStatus)
          if (error) throw error
          imported++
        }
        if (data.time_off_pending && Array.isArray(data.time_off_pending)) {
          const pendingWithStatus = data.time_off_pending.map(r => ({ ...r, status: 'pending' }))
          const { error } = await supabase.from(TABLES.TIME_OFF).insert(pendingWithStatus)
          if (error) throw error
          imported++
        }
        
        setMsg(`✅ Imported ${imported} sections! Refresh to see all data.`)
        setTimeout(() => setMsg(''), 5000)
      } catch (err) {
        console.error('Import error:', err)
        setMsg('❌ Failed to import data: ' + err.message)
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
          Downloads EVERYTHING from Supabase: Inventory, Shifts, Checklists, and Time Off
        </p>
        <button onClick={exportData} className="btn-primary w-full">
          📥 Export Full Data
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">📥 Import Data</h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload a previously exported JSON file to replace all database data
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