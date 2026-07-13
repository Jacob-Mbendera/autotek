import { useCrossTabSync } from '../hooks/useCrossTabSync';

/** Mount once at app root to sync client state across browser tabs. */
export const CrossTabSync = () => {
  useCrossTabSync();
  return null;
};
