import { useState } from 'react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function Inventory({ user }) {
  const [items, setItems] = useState([
    { id: 1, name: 'Beer Kegs (IPA)', category: 'drinks', quantity: 8, unit: 'kegs', threshold: 3 },
    { id: 2, name: 'House Wine (Red)', category: 'drinks', quantity: 12, unit: 'bottles', threshold: 5 },
    { id: 3, name: 'Cocktail Napkins', category: 'supplies', quantity: 150, unit: 'pcs', threshold: 50 },
    { id: 4, name: 'Cheddar Cheese', category: 'food', quantity: 10, unit: 'lbs', threshold: 3 },
  ])

  const updateQty = (id, delta) => {
    setItems(items.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">Track your stock levels</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><PlusIcon className="w-5 h-5" />Add Item</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className={`card ${item.quantity <= item.threshold ? 'border-red-500/50' : ''}`}>
            <div className="flex justify-between"><h3 className="font-semibold">{item.name}</h3></div>
            <div className="text-sm text-gray-400 capitalize mb-3">{item.category}</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-bar-blue rounded-lg">-</button>
                <span className="text-xl font-bold w-12 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-bar-blue rounded-lg">+</button>
              </div>
              <span className="text-sm text-gray-400">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
