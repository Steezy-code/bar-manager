import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline'

const INV_KEY = 'barmanager_inventory'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning! 🌅'
  if (hour < 17) return 'Good Afternoon! ☀️'
  return 'Good Evening! 🌙'
}

export default function Dashboard() {
  const [lowStock, setLowStock] = useState(0)
  const [lowItems, setLowItems] = useState([])
  const [greeting, setGreeting] = useState(getGreeting())

  useEffect(() => {
    const saved = localStorage.getItem(INV_KEY)
    if (saved) {
      const items = JSON.parse(saved)
      const low = items.filter(i => i.quantity <= (i.threshold || 5))
      setLowStock(low.length)
      setLowItems(low)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <h1 className="text-2xl font-bold">{greeting} 👋</h1>

      {/* Low Stock Alert */}
      {lowStock > 0 && (
        <div className="card bg-red-500/20 border border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <h2 className="text-red-400 font-bold">⚠️ Low Stock Alert</h2>
          </div>
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
