import { useEffect, useState } from 'react'
import { supabase, TABLES } from '../lib/supabase'
import { 
  ExclamationTriangleIcon, CalendarIcon, 
  ClipboardDocumentListIcon, UserGroupIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [stats, setStats] = useState({
    lowStock: 0,
    todayShifts: 0,
    pendingTasks: 0,
    timeOffRequests: 0
  })
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get low stock count
      const { data: inventory } = await supabase
        .from(TABLES.INVENTORY)
        .select('quantity, threshold')
      
      const lowStockCount = inventory?.filter(item => item.quantity <= item.threshold).length || 0

      // Get today's shifts
      const today = new Date().toISOString().split('T')[0]
      const { data: shifts } = await supabase
        .from(TABLES.SHIFTS)
        .select('*, profiles(full_name)')
        .eq('date', today)

      // Get pending time off
      const { data: timeOff } = await supabase
        .from(TABLES.TIME_OFF)
        .select('*')
        .eq('status', 'pending')

      setStats({
        lowStock: lowStockCount,
        todayShifts: shifts?.length || 0,
        pendingTasks: 3, // Placeholder
        timeOffRequests: timeOff?.length || 0
      })

      // Get low stock items for alerts
      const lowItems = inventory?.filter(item => item.quantity <= item.threshold).slice(0, 4)
      setRecentAlerts(lowItems || [])

    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { 
      label: 'Low Stock Items', 
      value: stats.lowStock, 
      icon: ExclamationTriangleIcon,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    { 
      label: "Today's Shifts", 
      value: stats.todayShifts, 
      icon: CalendarIcon,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      label: 'Pending Tasks', 
      value: stats.pendingTasks, 
      icon: ClipboardDocumentListIcon,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    },
    { 
      label: 'Time Off Requests', 
      value: stats.timeOffRequests, 
      icon: UserGroupIcon,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  if (loading) {
    return <div className="text-center py-20">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}! 👋</h1>
        <p className="text-gray-400">Here's what's happening at your bar today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            Low Stock Alerts
          </h2>
          {recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <span>{item.name || 'Unknown Item'}</span>
                  <span className="badge badge-critical">{item.quantity} left</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">All inventory is well-stocked! ✅</p>
          )}
          <a href="/inventory" className="btn-secondary block text-center mt-4">
            View Inventory →
          </a>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <a href="/inventory?action=add" className="btn-primary text-center">
              + Add Item
            </a>
            <a href="/schedule?action=add" className="btn-primary text-center">
              + Add Shift
            </a>
            <a href="/checklists" className="btn-secondary text-center">
              View Checklists
            </a>
            <a href="/timeoff" className="btn-secondary text-center">
              Time Off Requests
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
