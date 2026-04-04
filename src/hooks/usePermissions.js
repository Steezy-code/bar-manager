import { useAuth } from '../context/AuthContext';

// Hook for role-based permissions
export const usePermissions = () => {
  const { profile } = useAuth();

  const role = profile?.role || 'viewer';
  const status = profile?.status || 'pending';

  const hasRole = (requiredRole) => {
    // Role hierarchy: admin > manager > staff > viewer
    const hierarchy = { admin: 4, manager: 3, staff: 2, viewer: 1 };
    const userLevel = hierarchy[role] || 0;
    const requiredLevel = hierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  };

  const hasExactRole = (requiredRole) => role === requiredRole;

  const hasAnyRole = (roles) => roles.includes(role);

  const isApproved = status === 'approved';

  return {
    role,
    status,
    hasRole,
    hasExactRole,
    hasAnyRole,
    isApproved,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',
    isViewer: role === 'viewer',
  };
};