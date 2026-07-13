import { Navigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../store/types';
import { UserRole } from '@shared/types';
import { getSafeRedirectPath } from '../utils/safeRedirectPath';

interface GuestOnlyRouteProps {
  children: React.ReactNode;
}

/**
 * Auth pages (login, register, etc.) — redirect authenticated users away.
 */
export const GuestOnlyRoute = ({ children }: GuestOnlyRouteProps) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();

  if (isAuthenticated) {
    const returnUrl = searchParams.get('returnUrl');
    const defaultPath =
      user?.role === UserRole.ADMIN ? '/admin/dashboard' : '/';

    return (
      <Navigate
        to={getSafeRedirectPath(returnUrl, defaultPath)}
        replace
      />
    );
  }

  return <>{children}</>;
};
