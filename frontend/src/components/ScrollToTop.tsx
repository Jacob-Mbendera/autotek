import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Mount once at app root: resets scroll position on every route change. */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
