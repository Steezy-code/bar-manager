import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Schedule from './pages/Schedule';
import Checklists from './pages/Checklists';
import TimeOff from './pages/TimeOff';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
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
  const { user, profile, loading } = useAuth();
  const { hasRole, isApproved } = usePermissions();

  if (loading) {
    return <FullScreenLoader label="Loading…" />;
  }

  if (!user) {
    // Login/signup aren't routed in the demo build (the mock client always hands out
    // a session), so send unauthenticated visitors back to the landing page.
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    return <FullScreenLoader label="Loading your profile…" />;
  }

  // Any non-approved status (pending, rejected, removed, or unknown) is denied app
  // access and routed to the status screen. Gating on isApproved instead of listing
  // statuses means a newly added status can't accidentally fall through to the app.
  if (!isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main router component
const AppRouter = () => {
  const { user, signOut } = useAuth();

  return (
    <Routes>
      {/* Public front door — the showcase landing page */}
      <Route path="/" element={<Landing />} />

      {/* The live demo app. Guards stay in place; the demo session is an approved
          admin, so they all pass and admin/manager-only routes are reachable. */}
      <Route path="/app" element={
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
        <Route path="settings" element={
          <ProtectedRoute requiredRole="manager">
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="admin" element={
          <ProtectedRoute requiredRole="admin">
            <Admin />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
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
