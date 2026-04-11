/**
 * Persist pending service PayChangu session across tab close (same idea as product checkout).
 */
const TOWING_KEY = 'autotek_pendingPaychanguTowingServiceId';
const CAR_KEY = 'autotek_pendingPaychanguCarServiceId';

export function setPendingPaychanguService(ids: {
  towingServiceId?: string;
  carServiceId?: string;
}): void {
  try {
    if (ids.towingServiceId?.trim()) {
      localStorage.setItem(TOWING_KEY, ids.towingServiceId.trim());
      localStorage.removeItem(CAR_KEY);
    } else if (ids.carServiceId?.trim()) {
      localStorage.setItem(CAR_KEY, ids.carServiceId.trim());
      localStorage.removeItem(TOWING_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getPendingPaychanguService(): {
  towingServiceId: string;
  carServiceId: string;
} {
  try {
    return {
      towingServiceId: localStorage.getItem(TOWING_KEY) || '',
      carServiceId: localStorage.getItem(CAR_KEY) || '',
    };
  } catch {
    return { towingServiceId: '', carServiceId: '' };
  }
}

export function clearPendingPaychanguService(): void {
  try {
    localStorage.removeItem(TOWING_KEY);
    localStorage.removeItem(CAR_KEY);
  } catch {
    /* ignore */
  }
}
