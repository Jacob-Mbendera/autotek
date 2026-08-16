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
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();

  // On a hard page load, isAuthenticated starts false until the app-root
  // auth bootstrap has asked the server who the httpOnly cookie belongs to.
  // Redirecting to login before that resolves would wrongly bounce a
  // genuinely logged-in visitor. Render nothing until it settles.
  if (!isInitialized && !guestAllowed) {
    return null;
  }

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
