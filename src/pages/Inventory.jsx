import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusIcon, ExclamationTriangleIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

export default function Inventory() {
  const { user, profile } = useAuth()
  const { hasRole } = usePermissions()
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: '', threshold: 5 })
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)

  // Fetch inventory items from Supabase
  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching inventory:', err)
      alert('Failed to load inventory from database.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Save to Supabase (used for updates)
  const save = async (newItems) => {
    // Note: For simplicity, we're replacing the whole list in state.
    // In a real app, you'd do individual updates.
    setItems(newItems)
    // If you need to sync back to Supabase, you'd need to update each item.
    // For phase 1, we'll keep updates via update/remove functions.
  }

  // Update quantity (+/-)
  const update = async (id, delta) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    const newQuantity = Math.max(0, item.quantity + delta)
    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .update({ quantity: newQuantity })
        .eq('id', id)
      if (error) throw error

      setItems(items.map(i => i.id === id ? { ...i, quantity: newQuantity } : i))
    } catch (err) {
      console.error('Error updating quantity:', err)
      alert('Failed to update quantity in database.')
    }
  }

  // Remove item
  const remove = async (id) => {
    if (!confirm('Remove this item from inventory?')) return

    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .delete()
        .eq('id', id)
      if (error) throw error

      setItems(items.filter(i => i.id !== id))
    } catch (err) {
      console.error('Error removing item:', err)
      alert('Failed to remove item from database.')
    }
  }

  // Add new item
  const add = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('You must be logged in to add an item.')
      return
    }

    const itemToInsert = {
      name: newItem.name,
      quantity: newItem.quantity,
      unit: newItem.unit,
      threshold: newItem.threshold,
      user_id: user.id,
      role: profile?.role || 'staff'
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .insert([itemToInsert])
        .select('*')
      if (error) throw error

      const inserted = data[0]
      setItems([...items, inserted])
      setShowAdd(false)
      setNewItem({ name: '', quantity: 0, unit: '', threshold: 5 })
    } catch (err) {
      console.error('Error adding item:', err)
      alert('Failed to add item to database.')
    }
  }

  // Export inventory as JSON (local)
  const exportInventory = () => {
    const data = JSON.stringify(items, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  // Import inventory from JSON (local → Supabase)
  const importInventory = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (!Array.isArray(imported)) {
          alert('Invalid file format')
          return
        }
        
        const count = imported.length
        if (confirm(`This will replace ALL ${items.length} inventory items with ${count} items from the file. Continue?`)) {
          // Delete existing items
          const { error: deleteError } = await supabase
            .from(TABLES.INVENTORY)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // delete all
          if (deleteError) throw deleteError

          // Insert new items
          const itemsToInsert = imported.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            threshold: item.threshold,
            user_id: user?.id || null,
            role: profile?.role || 'staff'
          }))
          const { data, error: insertError } = await supabase
            .from(TABLES.INVENTORY)
            .insert(itemsToInsert)
            .select('*')
          if (insertError) throw insertError

          setItems(data || [])
          alert(`Replaced inventory with ${count} items`)
        }
      } catch (err) {
        console.error('Import error:', err)
        alert('Failed to import inventory: ' + err.message)
      }
    }
    reader.readAsText(file)
    fileInputRef.current.value = ''
  }

  const lowItems = items.filter(i => i.quantity <= (i.threshold || 5))

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <div className="flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading inventory...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">{items.length} items</p>
        </div>
        {hasRole('staff') && (
          <div className="flex gap-2">
            <button onClick={exportInventory} className="btn-secondary text-sm"><ArrowDownTrayIcon className="w-4 h-4" /> Export</button>
            <button onClick={() => fileInputRef.current.click()} className="btn-secondary text-sm"><ArrowUpTrayIcon className="w-4 h-4" /> Import</button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={importInventory} className="hidden" />
            <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-5 h-5" /> Add</button>
          </div>
        )}
      </div>

      {lowItems.length > 0 && (
        <div className="card bg-red-500/20 border border-red-500">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h3 className="text-red-400 font-bold">⚠️ Low Stock ({lowItems.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowItems.map(i => (
              <span key={i.id} className="bg-red-600 px-2 py-1 rounded text-sm">{i.name}: {i.quantity} left</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(i => {
          const isLow = i.quantity <= (i.threshold || 5)
          return (
            <div key={i.id} className={`card ${isLow ? 'border-red-500' : ''}`}>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">{i.name}</h3>
                {hasRole('staff') && (
                  <button onClick={() => remove(i.id)} className="text-red-500 p-1 hover:bg-red-500/20 rounded">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isLow && <p className="text-xs text-red-400">Low stock (min: {i.threshold})</p>}
              {hasRole('staff') ? (
                <div className="flex items-center mt-2">
                  <button onClick={() => update(i.id, -1)} className="w-8 h-8 bg-bar-blue rounded">-</button>
                  <span className="mx-3 font-bold">{i.quantity}</span>
                  <button onClick={() => update(i.id, 1)} className="w-8 h-8 bg-bar-blue rounded">+</button>
                  <span className="ml-2 text-sm text-gray-400">{i.unit}</span>
                </div>
              ) : (
                <div className="mt-2">
                  <span className="font-bold">{i.quantity}</span> <span className="text-sm text-gray-400">{i.unit}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={add} className="bg-bar-card p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Add Item</h2>
            <input placeholder="Name" className="input" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Qty" className="input" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: +e.target.value})} required />
              <input placeholder="Unit" className="input" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm text-gray-400">Low stock alert when qty ≤</label>
              <input type="number" className="input" value={newItem.threshold} onChange={e => setNewItem({...newItem, threshold: +e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}