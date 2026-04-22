import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Schedule from './pages/Schedule'
import Checklists from './pages/Checklists'
import TimeOff from './pages/TimeOff'
import Settings from './pages/Settings'
import Layout from './components/Layout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
