import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusIcon, ExclamationTriangleIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useNotifications } from '../components/Notifications'

const emptyItem = { name: '', quantity: 0, unit: '', threshold: 5 }

export default function Inventory() {
  const { user, profile } = useAuth()
  const { hasRole } = usePermissions()
  const { notify, confirmAction } = useNotifications()
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState(emptyItem)
  const [editingItem, setEditingItem] = useState(null)
  const [search, setSearch] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)

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
      notify('Failed to load inventory from database.', 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const update = async (id, delta) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    const newQuantity = Math.max(0, Number(item.quantity || 0) + delta)
    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .update({ quantity: newQuantity })
        .eq('id', id)
      if (error) throw error

      setItems(current => current.map(i => i.id === id ? { ...i, quantity: newQuantity } : i))
    } catch (err) {
      console.error('Error updating quantity:', err)
      notify('Failed to update quantity in database.', 'error')
    }
  }

  const remove = async (id) => {
    const item = items.find(i => i.id === id)
    const confirmed = await confirmAction({
      title: 'Remove inventory item?',
      message: `Remove ${item?.name || 'this item'} from inventory?`,
      confirmLabel: 'Remove',
      danger: true
    })
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .delete()
        .eq('id', id)
      if (error) throw error

      setItems(current => current.filter(i => i.id !== id))
      notify('Inventory item removed.', 'success')
    } catch (err) {
      console.error('Error removing item:', err)
      notify('Failed to remove item from database.', 'error')
    }
  }

  const add = async (e) => {
    e.preventDefault()
    if (!user) {
      notify('You must be logged in to add an item.', 'error')
      return
    }

    const itemToInsert = {
      name: newItem.name.trim(),
      quantity: Number(newItem.quantity || 0),
      unit: newItem.unit.trim(),
      threshold: Number(newItem.threshold || 0),
      user_id: user.id,
      role: profile?.role || 'staff'
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .insert([itemToInsert])
        .select('*')
      if (error) throw error

      setItems(current => [...current, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
      setNewItem(emptyItem)
      notify('Inventory item added.', 'success')
    } catch (err) {
      console.error('Error adding item:', err)
      notify('Failed to add item to database.', 'error')
    }
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editingItem || !hasRole('manager')) return

    const updates = {
      name: editingItem.name.trim(),
      quantity: Number(editingItem.quantity || 0),
      unit: editingItem.unit.trim(),
      threshold: Number(editingItem.threshold || 0)
    }

    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .update(updates)
        .eq('id', editingItem.id)
      if (error) throw error

      setItems(current => current.map(item => item.id === editingItem.id ? { ...item, ...updates } : item).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingItem(null)
      notify('Inventory item updated.', 'success')
    } catch (err) {
      console.error('Error editing item:', err)
      notify('Failed to update item in database.', 'error')
    }
  }

  const exportInventory = () => {
    const data = JSON.stringify(items, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importInventory = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (!Array.isArray(imported)) {
          notify('Invalid file format.', 'error')
          return
        }

        const confirmed = await confirmAction({
          title: 'Replace inventory?',
          message: `This will replace all ${items.length} inventory items with ${imported.length} items from the file.`,
          confirmLabel: 'Replace',
          danger: true
        })
        if (!confirmed) return

        const { error: deleteError } = await supabase
          .from(TABLES.INVENTORY)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
        if (deleteError) throw deleteError

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
        notify(`Replaced inventory with ${imported.length} items.`, 'success')
      } catch (err) {
        console.error('Import error:', err)
        notify(`Failed to import inventory: ${err.message}`, 'error')
      }
    }
    reader.readAsText(file)
    fileInputRef.current.value = ''
  }

  const lowItems = items.filter(i => Number(i.quantity || 0) <= Number(i.threshold || 5))
  const filteredItems = items.filter(item => {
    const haystack = `${item.name || ''} ${item.unit || ''}`.toLowerCase()
    const matchesSearch = haystack.includes(search.trim().toLowerCase())
    const matchesLow = !showLowOnly || Number(item.quantity || 0) <= Number(item.threshold || 5)
    return matchesSearch && matchesLow
  })

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
        <div className="flex h-64 items-center justify-center text-gray-400">Loading inventory...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">{items.length} items</p>
        </div>
        {hasRole('manager') && (
          <div className="flex flex-wrap gap-2">
            <button onClick={exportInventory} className="btn-secondary text-sm"><ArrowDownTrayIcon className="w-4 h-4" /> Export</button>
            <button onClick={() => fileInputRef.current.click()} className="btn-secondary text-sm"><ArrowUpTrayIcon className="w-4 h-4" /> Import</button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={importInventory} className="hidden" />
            <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-5 h-5" /> Add</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="input md:flex-1"
            placeholder="Search inventory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="rounded"
              checked={showLowOnly}
              onChange={e => setShowLowOnly(e.target.checked)}
            />
            Low stock only
          </label>
        </div>
      </div>

      {lowItems.length > 0 && (
        <div className="card border border-red-500 bg-red-500/20">
          <div className="mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-red-400">Low Stock ({lowItems.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowItems.map(i => (
              <span key={i.id} className="rounded bg-red-600 px-2 py-1 text-sm">{i.name}: {i.quantity} left</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map(i => {
          const isLow = Number(i.quantity || 0) <= Number(i.threshold || 5)
          return (
            <div key={i.id} className={`card ${isLow ? 'border-red-500' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{i.name}</h3>
                  {isLow && <p className="text-xs text-red-400">Low stock (min: {i.threshold})</p>}
                </div>
                {hasRole('manager') && (
                  <div className="flex gap-1">
                    <button onClick={() => setEditingItem(i)} className="rounded p-1 text-gray-300 hover:bg-bar-blue hover:text-white" aria-label={`Edit ${i.name}`}>
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(i.id)} className="rounded p-1 text-red-500 hover:bg-red-500/20" aria-label={`Remove ${i.name}`}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {hasRole('staff') ? (
                <div className="mt-3 flex items-center">
                  <button onClick={() => update(i.id, -1)} className="h-9 w-9 rounded bg-bar-blue text-lg">-</button>
                  <span className="mx-3 font-bold">{i.quantity}</span>
                  <button onClick={() => update(i.id, 1)} className="h-9 w-9 rounded bg-bar-blue text-lg">+</button>
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

      {filteredItems.length === 0 && (
        <div className="py-8 text-center text-gray-400">No inventory items match those filters.</div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={add} className="w-full max-w-md space-y-3 rounded-xl bg-bar-card p-6">
            <h2 className="text-xl font-bold">Add Item</h2>
            <input placeholder="Name" className="input" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="0" placeholder="Qty" className="input" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} required />
              <input placeholder="Unit" className="input" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-gray-400">Low stock alert when qty is at or below</label>
              <input type="number" min="0" className="input" value={newItem.threshold} onChange={e => setNewItem({ ...newItem, threshold: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Add</button>
            </div>
          </form>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md space-y-3 rounded-xl bg-bar-card p-6">
            <h2 className="text-xl font-bold">Edit Item</h2>
            <input placeholder="Name" className="input" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} required />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="0" placeholder="Qty" className="input" value={editingItem.quantity} onChange={e => setEditingItem({ ...editingItem, quantity: e.target.value })} required />
              <input placeholder="Unit" className="input" value={editingItem.unit || ''} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-gray-400">Low stock alert when qty is at or below</label>
              <input type="number" min="0" className="input" value={editingItem.threshold} onChange={e => setEditingItem({ ...editingItem, threshold: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingItem(null)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
