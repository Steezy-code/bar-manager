import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Schedule from './pages/Schedule';
import Checklists from './pages/Checklists';
import TimeOff from './pages/TimeOff';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import PendingApproval from './pages/PendingApproval';
import Admin from './pages/Admin';
import Layout from './components/Layout';

// Protected wrapper that checks auth and status
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-bar-dark flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check status
  if (profile?.status === 'pending') {
    return <Navigate to="/pending-approval" />;
  }

  // Optionally check role (if requiredRole provided)
  if (requiredRole && profile?.role !== requiredRole) {
    // If user doesn't have required role, redirect to dashboard (or show unauthorized)
    return <Navigate to="/" />;
  }

  return children;
};

// Main router component
const AppRouter = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/" />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout user={user} onLogout={signOut} />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="timeoff" element={<TimeOff />} />
        <Route path="settings" element={<Settings />} />
        {/* Admin-only routes (example) */}
        <Route path="admin" element={
          <ProtectedRoute requiredRole="admin">
            <Admin />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}