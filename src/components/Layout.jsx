import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { HomeIcon, CubeIcon, CalendarIcon, ClipboardDocumentCheckIcon, UserGroupIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon, UserIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

const navItems = [
  { name: 'Dashboard', path: '/', icon: HomeIcon },
  { name: 'Inventory', path: '/inventory', icon: CubeIcon },
  { name: 'Schedule', path: '/schedule', icon: CalendarIcon },
  { name: 'Checklists', path: '/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'Time Off', path: '/timeoff', icon: UserGroupIcon },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
]

export default function Layout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { hasRole, isApproved } = usePermissions()

  // Pull-to-refresh: tells the active page to re-fetch (pages opt in via useAppRefresh).
  const { distance, refreshing, pulling } = usePullToRefresh(async () => {
    window.dispatchEvent(new Event('app:refresh'))
    // Brief delay so the spinner is perceptible even on fast refetches.
    await new Promise((r) => setTimeout(r, 600))
  })

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout()
    }
    navigate('/login')
  }

  // Filter nav items based on role
  const filteredNavItems = navItems.filter(item => {
    if (item.path === '/inventory') {
      return hasRole('manager') // manager or admin
    }
    if (item.path === '/settings') {
      return hasRole('manager') // manager or admin
    }
    return true
  })

  const allNavItems = [...filteredNavItems]
  if (isApproved && hasRole('admin')) {
    allNavItems.push({ name: 'Admin', path: '/admin', icon: ShieldCheckIcon })
  }

  return (
    <div className="min-h-screen bg-bar-dark">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-bar-card border-r border-bar-blue transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-bar-blue">
          <h1 className="text-xl font-bold text-bar-accent">🍻 BarManager</h1>
          <button onClick={() => setSidebarOpen(false)}><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <nav className="p-4 space-y-2">
          {allNavItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-bar-accent text-white' : 'text-gray-400 hover:bg-bar-blue hover:text-white'}`}>
              <item.icon className="w-5 h-5" />{item.name}
            </NavLink>
          ))}
        </nav>
        
        {/* User info & logout */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-bar-blue p-4 bg-bar-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-bar-accent flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-gray-500">Role: {profile?.role || 'viewer'} · {profile?.status || 'pending'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-400 hover:text-white w-full px-3 py-2 rounded-lg hover:bg-bar-blue transition"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Sign out
            </button>
          </div>
        )}
      </div>
      <div className="lg:ml-64 print:ml-0">
        <header className="lg:hidden flex items-center justify-between p-4 bg-bar-card border-b border-bar-blue print:hidden">
          <button onClick={() => setSidebarOpen(true)}><Bars3Icon className="w-6 h-6" /></button>
          <h1 className="text-lg font-bold text-bar-accent">BarManager</h1>
          <div className="w-6" />
        </header>
        {/* Pull-to-refresh indicator (touch only) */}
        {(pulling || refreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden text-bar-accent lg:hidden print:hidden"
            style={{ height: refreshing ? 48 : distance }}
          >
            <ArrowPathIcon
              className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`}
              style={{ transform: refreshing ? undefined : `rotate(${distance * 3}deg)` }}
            />
          </div>
        )}
        <main className="p-4 pb-28 lg:p-8 lg:pb-8 print:p-2"><Outlet /></main>
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bar-card border-t border-bar-blue flex justify-around py-3 pb-safe-nav z-40 print:hidden">
        {allNavItems.slice(0, 5).map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-1 min-h-touch ${isActive ? 'text-bar-accent' : 'text-gray-500'}`}>
            <item.icon className="w-5 h-5" /><span className="text-xs">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
