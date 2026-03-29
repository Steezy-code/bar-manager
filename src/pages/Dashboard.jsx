import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExclamationTriangleIcon, CalendarIcon, ClipboardDocumentListIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline'

const INV_KEY = 'barmanager_inventory'

export default function Dashboard() {
  const [lowStock, setLowStock] = useState(0)
  const [lowItems, setLowItems] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem(INV_KEY)
    if (saved) {
      const items = JSON.parse(saved)
      const low = items.filter(i => i.quantity <= (i.threshold || 5))
      setLowStock(low.length)
      setLowItems(low)
    }
  }, [])

  const stats = [
    { label: 'Low Stock', value: lowStock, icon: ExclamationTriangleIcon, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: "Quick Add", value: '+', icon: PlusIcon, color: 'text-green-500', bg: 'bg-green-500/10' },
  ]

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <h1 className="text-2xl font-bold">Good Morning! 👋</h1>

      {/* Low Stock Alert */}
      {lowStock > 0 && (
        <div className="card bg-red-500/20 border border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <h2 className="text-red-400 font-bold">⚠️ Low Stock Alert</h2>
          </div>
          <p className="text-gray-300 mb-3">The following items need restocking:</p>
          <div className="space-y-2">
            {lowItems.map(i => (
              <div key={i.id} className="flex justify-between bg-red-600/30 p-2 rounded">
                <span>{i.name}</span>
                <span className="text-red-300">Only {i.quantity} left</span>
              </div>
            ))}
          </div>
          <Link to="/inventory" className="btn-primary w-full mt-4 text-center">
            Go to Inventory →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/inventory" className="btn-primary text-center">+ Add Item</Link>
          <Link to="/schedule" className="btn-primary text-center">+ Add Shift</Link>
          <Link to="/checklists" className="btn-secondary text-center">Checklists</Link>
          <Link to="/timeoff" className="btn-secondary text-center">Time Off</Link>
        </div>
      </div>
    </div>
  )
}
