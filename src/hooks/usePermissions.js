import { useAuth } from '../context/AuthContext';

export const ROLE_HIERARCHY = {
  admin: 4,
  manager: 3,
  staff: 2,
  viewer: 1,
};

export const usePermissions = () => {
  const { profile } = useAuth();

  const role = profile?.role || 'viewer';
  const status = profile?.status || 'pending';
  const isApproved = status === 'approved';

  const getRoleLevel = (value) => ROLE_HIERARCHY[value] || 0;

  const hasRole = (requiredRole) => {
    if (!isApproved) return false;
    return getRoleLevel(role) >= getRoleLevel(requiredRole);
  };

  const hasExactRole = (requiredRole) => isApproved && role === requiredRole;

  const hasAnyRole = (roles) => isApproved && roles.some((candidate) => getRoleLevel(role) >= getRoleLevel(candidate));

  return {
    role,
    status,
    isApproved,
    isPending: status === 'pending',
    isRejected: status === 'rejected',
    getRoleLevel,
    hasRole,
    hasExactRole,
    hasAnyRole,
    isAdmin: isApproved && role === 'admin',
    isManager: isApproved && role === 'manager',
    isStaff: isApproved && role === 'staff',
    isViewer: isApproved && role === 'viewer',
  };
};