import { useEffect, useState } from 'react'
import { supabase, TABLES } from '../lib/supabase'
import { PlusIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const categories = ['all', 'drinks', 'food', 'supplies', 'cleaning']

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'drinks',
    quantity: 0,
    unit: '',
    threshold: 5
  })

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .select('*')
        .order('name')
      
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error loading inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .insert([newItem])
      
      if (error) throw error
      setShowModal(false)
      setNewItem({ name: '', category: 'drinks', quantity: 0, unit: '', threshold: 5 })
      loadInventory()
    } catch (err) {
      alert('Error adding item: ' + err.message)
    }
  }

  const updateQuantity = async (id, change) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    
    const newQty = item.quantity + change
    if (newQty < 0) return

    try {
      await supabase
        .from(TABLES.INVENTORY)
        .update({ quantity: newQty })
        .eq('id', id)
      
      loadInventory()
    } catch (err) {
      console.error('Error updating quantity:', err)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || item.category === category
    return matchesSearch && matchesCategory
  })

  const lowStockCount = items.filter(i => i.quantity <= i.threshold).length

  if (loading) return <div className="text-center py-20">Loading inventory...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">
            {lowStockCount > 0 && (
              <span className="text-red-500 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {lowStockCount} items need restocking
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg capitalize whitespace-nowrap ${
                category === cat ? 'bg-bar-accent text-white' : 'bg-bar-card text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => {
          const isLow = item.quantity <= item.threshold
          return (
            <div key={item.id} className={`card ${isLow ? 'border-red-500/50' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{item.name}</h3>
                {isLow && <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />}
              </div>
              
              <div className="text-sm text-gray-400 mb-3 capitalize">{item.category}</div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 bg-bar-blue rounded-lg hover:bg-blue-700"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-12 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 bg-bar-blue rounded-lg hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-400">{item.unit}</span>
              </div>
              
              {isLow && (
                <div className="mt-3 text-xs text-red-400">
                  Low stock! Threshold: {item.threshold}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No items found. Add some inventory to get started!
        </div>
      )}

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>
            <form onSubmit={addItem} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="input"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="input"
                  >
                    <option value="drinks">Drinks</option>
                    <option value="food">Food</option>
                    <option value="supplies">Supplies</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    className="input"
                    placeholder="cases, lbs, rolls..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={newItem.threshold}
                    onChange={(e) => setNewItem({...newItem, threshold: parseInt(e.target.value) || 5})}
                    className="input"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
