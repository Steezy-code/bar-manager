import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Schedule from './pages/Schedule'
import Checklists from './pages/Checklists'
import TimeOff from './pages/TimeOff'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import PendingApproval from './pages/PendingApproval'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Test connection first
      const { data: test, error: testError } = await supabase.from('profiles').select('count').limit(1)
      
      if (testError) {
        console.log('DB connection issue, using demo mode:', testError.message)
        setDbError(true)
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      }
    } catch (err) {
      console.error('Error checking user:', err)
      setDbError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bar-dark flex items-center justify-center">
        <div className="text-bar-accent text-xl">Loading...</div>
      </div>
    )
  }

  // If no session and DB error, show demo login
  if (!session && dbError) {
    return <Login />
  }

  if (!session) {
    return <Login />
  }

  if (profile && !profile.approved) {
    return <PendingApproval />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="checklists" element={<Checklists />} />
          <Route path="timeoff" element={<TimeOff />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
