import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Schedule from './pages/Schedule'
import Checklists from './pages/Checklists'
import TimeOff from './pages/TimeOff'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem('barmanager_user')
    if (savedUser) {
      setUser({ email: savedUser, role: 'manager' })
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-bar-dark flex items-center justify-center">
        <div className="text-bar-accent text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={(email) => {
      localStorage.setItem('barmanager_user', email)
      setUser({ email, role: 'manager' })
    }} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="/" element={<Layout user={user} onLogout={() => {
          localStorage.removeItem('barmanager_user')
          setUser(null)
        }} />}>
          <Route index element={<Dashboard user={user} />} />
          <Route path="inventory" element={<Inventory user={user} />} />
          <Route path="schedule" element={<Schedule user={user} />} />
          <Route path="checklists" element={<Checklists user={user} />} />
          <Route path="timeoff" element={<TimeOff user={user} />} />
          <Route path="settings" element={<Settings user={user} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
