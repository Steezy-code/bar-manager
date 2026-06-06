import { useCallback } from 'react';
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

  const getRoleLevel = useCallback((value) => ROLE_HIERARCHY[value] || 0, []);

  const hasRole = useCallback((requiredRole) => {
    if (!isApproved) return false;
    return getRoleLevel(role) >= getRoleLevel(requiredRole);
  }, [getRoleLevel, isApproved, role]);

  const hasExactRole = useCallback((requiredRole) => isApproved && role === requiredRole, [isApproved, role]);

  const hasAnyRole = useCallback(
    (roles) => isApproved && roles.some((candidate) => getRoleLevel(role) >= getRoleLevel(candidate)),
    [getRoleLevel, isApproved, role]
  );

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
