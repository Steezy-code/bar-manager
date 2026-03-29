import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExclamationTriangleIcon, CalendarIcon, ClipboardDocumentListIcon, UserGroupIcon } from '@heroicons/react/24/outline'

export default function Dashboard({ user }) {
  const [stats] = useState({
    lowStock: 3,
    todayShifts: 5,
    pendingTasks: 2,
    timeOffRequests: 1
  })

  const statCards = [
    { label: 'Low Stock Items', value: stats.lowStock, icon: ExclamationTriangleIcon, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: "Today's Shifts", value: stats.todayShifts, icon: CalendarIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: ClipboardDocumentListIcon, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Time Off Requests', value: stats.timeOffRequests, icon: UserGroupIcon, color: 'text-green-500', bg: 'bg-green-500/10' },
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}! 👋</h1>
        <p className="text-gray-400">Here's what's happening at your bar today</p>
        <p className="text-bar-accent text-sm mt-1">Logged in as: {user?.email}</p>
      </div>

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

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/inventory" className="btn-primary text-center">+ Add Item</Link>
          <Link to="/schedule" className="btn-primary text-center">+ Add Shift</Link>
          <Link to="/checklists" className="btn-secondary text-center">View Checklists</Link>
          <Link to="/timeoff" className="btn-secondary text-center">Time Off Requests</Link>
        </div>
      </div>
    </div>
  )
}
