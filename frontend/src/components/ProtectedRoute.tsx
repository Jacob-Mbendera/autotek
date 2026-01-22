import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/types';
import { UserRole } from '../../../../shared/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve the current location as return URL
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  if (adminOnly && user?.role !== UserRole.ADMIN) {
    // Redirect non-admin users trying to access admin routes
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
