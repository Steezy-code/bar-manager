import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { HomeIcon, CubeIcon, CalendarIcon, ClipboardDocumentCheckIcon, UserGroupIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon, UserIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, ArrowPathIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import Modal from './Modal'

const navItems = [
  { name: 'Dashboard', path: '/app', icon: HomeIcon },
  { name: 'Inventory', path: '/app/inventory', icon: CubeIcon },
  { name: 'Schedule', path: '/app/schedule', icon: CalendarIcon },
  { name: 'Checklists', path: '/app/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'Time Off', path: '/app/timeoff', icon: UserGroupIcon },
  { name: 'Settings', path: '/app/settings', icon: Cog6ToothIcon },
]

export default function Layout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingTimeOffCount, setPendingTimeOffCount] = useState(0)
  const [pendingUsersCount, setPendingUsersCount] = useState(0)
  // ponytail: localStorage flag, no store/provider.
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return localStorage.getItem('bm-demo-welcomed') !== '1' } catch { return true }
  })
  const dismissWelcome = () => {
    try { localStorage.setItem('bm-demo-welcomed', '1') } catch { /* private mode */ }
    setShowWelcome(false)
  }
  // Session-scoped (not permanent like the welcome modal): dismiss for this visit,
  // but show again on a fresh visit so first-time recruiters still see it once.
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return sessionStorage.getItem('bm-demo-banner-dismissed') === '1' } catch { return false }
  })
  const dismissBanner = () => {
    try { sessionStorage.setItem('bm-demo-banner-dismissed', '1') } catch { /* private mode */ }
    setBannerDismissed(true)
  }
  const [showMore, setShowMore] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const { hasRole, isApproved } = usePermissions()

  const fetchBadgeCounts = useCallback(async () => {
    const queries = []
    if (hasRole('manager')) {
      queries.push(
        supabase.from(TABLES.TIME_OFF).select('id', { count: 'exact', head: true }).eq('status', 'pending')
      )
    } else {
      queries.push(Promise.resolve({ count: 0, error: null }))
    }
    if (hasRole('admin')) {
      queries.push(
        supabase.from(TABLES.PROFILES).select('id', { count: 'exact', head: true }).eq('status', 'pending')
      )
    } else {
      queries.push(Promise.resolve({ count: 0, error: null }))
    }
    const [timeOffResult, usersResult] = await Promise.all(queries)
    if (!timeOffResult.error) setPendingTimeOffCount(timeOffResult.count || 0)
    if (!usersResult.error) setPendingUsersCount(usersResult.count || 0)
  }, [hasRole])

  useEffect(() => {
    fetchBadgeCounts()
    const handler = () => fetchBadgeCounts()
    window.addEventListener('app:refresh', handler)
    return () => window.removeEventListener('app:refresh', handler)
  }, [fetchBadgeCounts])

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
    navigate('/')
  }

  // Filter nav items based on role
  const filteredNavItems = navItems.filter(item => {
    if (item.path === '/app/inventory') {
      return hasRole('manager') // manager or admin
    }
    if (item.path === '/app/settings') {
      return hasRole('manager') // manager or admin
    }
    return true
  })

  const allNavItems = [...filteredNavItems]
  if (isApproved && hasRole('admin')) {
    allNavItems.push({ name: 'Admin', path: '/app/admin', icon: ShieldCheckIcon })
  }

  const navBadges = {
    '/app/timeoff': pendingTimeOffCount > 0 ? pendingTimeOffCount : null,
    '/app/admin': pendingUsersCount > 0 ? pendingUsersCount : null,
  }

  // Mobile bottom nav only has room for ~5 tabs. Previously it just sliced the full
  // list to 5, which silently dropped Settings/Admin (and Admin's badge) for any role
  // that saw more than 5 items. Now anything past the first 4 collapses into a "More"
  // tab + sheet instead of disappearing.
  const mobilePrimary = allNavItems.slice(0, 4)
  const mobileOverflow = allNavItems.slice(4)
  const mobileTabs = mobileOverflow.length > 0 ? [...mobilePrimary, { name: 'More', isMore: true }] : mobilePrimary
  const moreBadgeCount = mobileOverflow.reduce((sum, item) => sum + (navBadges[item.path] || 0), 0)

  const isItemActive = (item) => (item.path === '/app' ? pathname === '/app' : pathname.startsWith(item.path))
  const activeNavIndex = mobileOverflow.some(isItemActive)
    ? mobileTabs.length - 1
    : mobilePrimary.findIndex(isItemActive)

  return (
    <div className="min-h-screen bg-bar-dark">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-bar-card border-r border-bar-blue transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-bar-blue">
          <h1 className="text-xl font-bold text-bar-accent">🍻 BarManager</h1>
          {/* Sidebar is a mobile-only drawer (permanently pinned open at lg: via
              lg:translate-x-0 above) — hide the close button there since clicking it
              can't actually collapse anything and would look like a dead control. */}
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <nav className="p-4 space-y-2">
          {allNavItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/app'} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-bar-accent text-white' : 'text-gray-400 hover:bg-bar-blue hover:text-white'}`}>
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.name}</span>
              {navBadges[item.path] && (
                <span className="ml-auto text-xs bg-bar-accent rounded-full px-1.5 py-0.5 font-semibold leading-none text-white">
                  {navBadges[item.path]}
                </span>
              )}
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
        {!bannerDismissed && (
          <div className="flex items-center justify-between gap-3 bg-bar-accent/15 border-b border-bar-accent/30 px-4 py-2 text-xs text-bar-accent print:hidden">
            <span className="font-medium">
              <span className="hidden sm:inline">🍻 Portfolio demo — sample data, nothing is saved.</span>
              <span className="sm:hidden">Demo · nothing saved</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <Link to="/" className="font-semibold hover:underline">← Overview</Link>
              <button type="button" onClick={dismissBanner} aria-label="Dismiss demo banner" className="text-sm leading-none hover:text-white">×</button>
            </span>
          </div>
        )}
        <header className="lg:hidden flex items-center justify-between px-4 pb-4 pt-safe-app bg-bar-card border-b border-bar-blue print:hidden">
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
        <main className="px-4 pt-4 pb-safe-content lg:p-8 lg:pb-8 print:p-2"><Outlet /></main>
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bar-card border-t border-bar-blue flex pt-3 pb-safe-nav z-40 print:hidden">
        {activeNavIndex >= 0 && (
          <div
            className="pointer-events-none absolute left-0 top-2 h-11 px-0.5 transition-transform duration-300"
            style={{
              width: `${100 / mobileTabs.length}%`,
              transform: `translateX(${activeNavIndex * 100}%)`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="h-full w-full rounded-full ring-1 ring-inset ring-white/[0.15]"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 100%)' }}
            />
          </div>
        )}
        {mobilePrimary.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/app'} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-1 min-h-touch ${isActive ? 'text-bar-accent' : 'text-gray-500'}`}>
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {navBadges[item.path] && (
                <span className="absolute -top-1.5 -right-2 text-[9px] bg-red-500 text-white rounded-full px-1 leading-tight font-bold min-w-[14px] text-center">
                  {navBadges[item.path]}
                </span>
              )}
            </div>
            <span className="text-xs">{item.name}</span>
          </NavLink>
        ))}
        {mobileOverflow.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 min-h-touch ${mobileOverflow.some(isItemActive) ? 'text-bar-accent' : 'text-gray-500'}`}
          >
            <div className="relative">
              <EllipsisHorizontalIcon className="w-5 h-5" />
              {moreBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2 text-[9px] bg-red-500 text-white rounded-full px-1 leading-tight font-bold min-w-[14px] text-center">
                  {moreBadgeCount}
                </span>
              )}
            </div>
            <span className="text-xs">More</span>
          </button>
        )}
      </nav>

      {/* Mobile-only "More" sheet — everything that doesn't fit in the bottom 4 tabs
          (Time Off, Settings, Admin), so nothing is unreachable on small screens. */}
      <Modal open={showMore} onClose={() => setShowMore(false)} title="More">
        <div className="space-y-1">
          {mobileOverflow.map((item) => {
            const isAdmin = item.path === '/app/admin'
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 rounded-lg px-3 min-h-touch ${isAdmin ? 'bg-bar-surface font-bold text-white' : 'text-gray-200'}`}
              >
                <item.icon className={`h-[18px] w-[18px] ${isAdmin ? 'text-bar-accent-light' : 'text-gray-400'}`} />
                <span className="flex-1 text-[15px] font-semibold">{item.name}</span>
                {navBadges[item.path] && (
                  <span className="text-xs bg-bar-accent rounded-full px-1.5 py-0.5 font-semibold leading-none text-white">
                    {navBadges[item.path]}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </Modal>

      <Modal open={showWelcome} onClose={dismissWelcome} title="Welcome to the BarManager demo 👋">
        <div className="space-y-3 text-sm text-gray-300">
          <p>You're signed in as an admin on a fully interactive demo — no login, no backend. All data is sample data held in memory, so edits stick while you browse and reset on refresh.</p>
          <p className="font-semibold text-white">Try poking around:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="text-white">Schedule</span> — add a shift or build a month</li>
            <li><span className="text-white">Checklists</span> — tick off opening tasks</li>
            <li><span className="text-white">Inventory</span> — adjust quantities, watch low-stock alerts</li>
            <li><span className="text-white">Admin</span> — see the role &amp; approval management</li>
          </ul>
        </div>
        <button onClick={dismissWelcome} className="btn-primary mt-5 w-full">Start exploring</button>
      </Modal>
    </div>
  )
}
