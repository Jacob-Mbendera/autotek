import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/types';
import { UserRole } from '@shared/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  guestAllowed?: boolean;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({
  children,
  adminOnly = false,
  guestAllowed = false,
  allowedRoles,
}: ProtectedRouteProps) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();

  if (!isAuthenticated && !guestAllowed) {
    // Preserve the current location as return URL
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  if (adminOnly && user?.role !== UserRole.ADMIN) {
    // Redirect non-admin users trying to access admin routes
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
