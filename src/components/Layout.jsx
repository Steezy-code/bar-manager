import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  HomeIcon, CubeIcon, CalendarIcon, ClipboardDocumentCheckIcon, 
  UserGroupIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon,
  Bars3Icon, XMarkIcon
} from '@heroicons/react/24/outline'

const navItems = [
  { name: 'Dashboard', path: '/', icon: HomeIcon },
  { name: 'Inventory', path: '/inventory', icon: CubeIcon },
  { name: 'Schedule', path: '/schedule', icon: CalendarIcon },
  { name: 'Checklists', path: '/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'Time Off', path: '/timeoff', icon: UserGroupIcon },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bar-dark">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-bar-card border-r border-bar-blue transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-bar-blue">
          <h1 className="text-xl font-bold text-bar-accent">🍻 BarManager</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? 'bg-bar-accent text-white' : 'text-gray-400 hover:bg-bar-blue hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-bar-blue">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-400 hover:bg-red-600 hover:text-white transition"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-bar-card border-b border-bar-blue">
          <button onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-bar-accent">BarManager</h1>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="p-4 pb-20 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bar-card border-t border-bar-blue flex justify-around py-3">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${isActive ? 'text-bar-accent' : 'text-gray-500'}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
