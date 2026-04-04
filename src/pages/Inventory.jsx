import { useState, useEffect, useRef } from 'react'
import { PlusIcon, ExclamationTriangleIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { usePermissions } from '../hooks/usePermissions'

const STORAGE_KEY = 'barmanager_inventory'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: '', threshold: 5 })
  const fileInputRef = useRef(null)
  const { hasRole } = usePermissions()

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setItems(JSON.parse(saved))
    } else {
      const defaults = [
        { id: 1, name: 'Beer Kegs (IPA)', quantity: 8, unit: 'kegs', threshold: 3 },
        { id: 2, name: 'House Wine (Red)', quantity: 12, unit: 'bottles', threshold: 5 },
        { id: 3, name: 'Cocktail Napkins', quantity: 150, unit: 'pcs', threshold: 50 },
        { id: 4, name: 'Cheddar Cheese', quantity: 10, unit: 'lbs', threshold: 3 },
      ]
      setItems(defaults)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    }
  }, [])

  const save = (newItems) => {
    setItems(newItems)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems))
  }

  const update = (id, delta) => {
    const updated = items.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
    save(updated)
  }

  const remove = (id) => {
    if (confirm('Remove this item from inventory?')) {
      save(items.filter(i => i.id !== id))
    }
  }

  const add = (e) => {
    e.preventDefault()
    const item = { ...newItem, id: Date.now() }
    save([...items, item])
    setShowAdd(false)
    setNewItem({ name: '', quantity: 0, unit: '', threshold: 5 })
  }

  const exportInventory = () => {
    const data = JSON.stringify(items, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const importInventory = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (!Array.isArray(imported)) {
          alert('Invalid file format')
          return
        }
        
        const count = imported.length
        if (confirm(`This will replace ALL ${items.length} inventory items with ${count} items from the file. Continue?`)) {
          const withIds = imported.map((item, idx) => ({ ...item, id: Date.now() + idx }))
          save(withIds)
          alert(`Replaced inventory with ${count} items`)
        }
      } catch (err) {
        alert('Failed to parse file: ' + err.message)
      }
    }
    reader.readAsText(file)
    fileInputRef.current.value = ''
  }

  const lowItems = items.filter(i => i.quantity <= (i.threshold || 5))

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
