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
import { NotificationsProvider } from './components/Notifications';
import { Skeleton } from './components/Skeleton';
import OfflineIndicator from './components/OfflineIndicator';

// Full-screen loading state with a branded spinner-free skeleton feel.
const FullScreenLoader = ({ label }) => (
  <div className="min-h-screen bg-bar-dark flex flex-col items-center justify-center gap-4 p-6">
    <div className="text-2xl font-bold text-bar-accent">🍻 BarManager</div>
    <div className="w-full max-w-xs space-y-3">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

// Protected wrapper that checks auth, approval status, and role hierarchy
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const { profile } = useAuth();
  const { hasRole, isPending, isRejected } = usePermissions();

  if (loading) {
    return <FullScreenLoader label="Loading…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <FullScreenLoader label="Loading your profile…" />;
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
        <Route path="inventory" element={
          <ProtectedRoute requiredRole="manager">
            <Inventory />
          </ProtectedRoute>
        } />
        <Route path="schedule" element={<Schedule />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="timeoff" element={<TimeOff />} />
        <Route path="settings" element={          <ProtectedRoute requiredRole="manager">            <Settings />          </ProtectedRoute>        } />
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
        <NotificationsProvider>
          <OfflineIndicator />
          <AppRouter />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
