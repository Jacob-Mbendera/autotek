import { useAuthBootstrap } from '../hooks/useAuthBootstrap';

/** Mount once at app root to restore session state from the httpOnly auth cookie. */
export const AuthBootstrap = () => {
  useAuthBootstrap();
  return null;
};
