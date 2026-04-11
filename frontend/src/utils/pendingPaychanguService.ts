/**
 * Persist pending service PayChangu session across tab close (same idea as product checkout).
 */
const TOWING_KEY = 'autotek_pendingPaychanguTowingServiceId';
const CAR_KEY = 'autotek_pendingPaychanguCarServiceId';
const HOLD_ID_KEY = 'autotek_servicePayNowHoldServiceId';
const HOLD_UNTIL_KEY = 'autotek_servicePayNowHoldUntil';

export const SERVICE_PAYCHANGU_STORAGE_EVENT = 'autotek-service-paychangu-storage';

function notifyServicePaychanguStorage(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SERVICE_PAYCHANGU_STORAGE_EVENT));
}

export function normalizeServiceId(id: unknown): string {
  if (id == null) return '';
  return String(id).trim();
}

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
    notifyServicePaychanguStorage();
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
    notifyServicePaychanguStorage();
  } catch {
    /* ignore */
  }
}

/**
 * After successful verify, pending keys are cleared before RTK refetches; keep Pay Now hidden briefly
 * so the row does not flash enabled while paymentStatus is still "pending" in cache.
 */
export function setServicePayNowUiHold(serviceId: string, ms: number = 8000): void {
  try {
    const id = normalizeServiceId(serviceId);
    if (!id) return;
    localStorage.setItem(HOLD_ID_KEY, id);
    localStorage.setItem(HOLD_UNTIL_KEY, String(Date.now() + ms));
    notifyServicePaychanguStorage();
  } catch {
    /* ignore */
  }
}

export function getServicePayNowUiHold(): { id: string } | null {
  try {
    const id = localStorage.getItem(HOLD_ID_KEY)?.trim();
    const until = Number(localStorage.getItem(HOLD_UNTIL_KEY));
    if (!id || !until) return null;
    if (Date.now() > until) {
      localStorage.removeItem(HOLD_ID_KEY);
      localStorage.removeItem(HOLD_UNTIL_KEY);
      notifyServicePaychanguStorage();
      return null;
    }
    return { id };
  } catch {
    return null;
  }
}

/** Snapshot for useSyncExternalStore (same-tab localStorage updates do not fire "storage"). */
export function getServicePaychanguLockSnapshot(): string {
  const p = getPendingPaychanguService();
  const h = getServicePayNowUiHold();
  return JSON.stringify({
    t: p.towingServiceId,
    c: p.carServiceId,
    h: h?.id ?? '',
  });
}

export function getServerServicePaychanguLockSnapshot(): string {
  return JSON.stringify({ t: '', c: '', h: '' });
}

export function subscribeServicePaychanguLocks(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => onChange();
  window.addEventListener(SERVICE_PAYCHANGU_STORAGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SERVICE_PAYCHANGU_STORAGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
