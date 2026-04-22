import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
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

// Protected wrapper that checks auth, approval status, and role hierarchy
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const { profile } = useAuth();
  const { hasRole, isPending, isRejected } = usePermissions();

  if (loading) {
    return <div className="min-h-screen bg-bar-dark flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <div className="min-h-screen bg-bar-dark flex items-center justify-center">Loading profile...</div>;
  }

  if (isPending) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (isRejected) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main router component
const AppRouter = () => {
  const { user, profile, signOut } = useAuth();

  const homeDestination = !user
    ? '/login'
    : profile?.status === 'approved'
      ? '/'
      : '/pending-approval';

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={homeDestination} replace />} />
      <Route path="/signup" element={!user ? <SignUp /> : <Navigate to={homeDestination} replace />} />
      <Route path="/pending-approval" element={user ? <PendingApproval /> : <Navigate to="/login" replace />} />
      
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