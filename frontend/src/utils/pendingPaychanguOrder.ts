/**
 * Persist pending product-checkout order across tab close (e.g. user pays on PayChangu
 * but closes before the browser redirect to /payment/success).
 * sessionStorage is tied to the tab and is lost when that tab is closed.
 */
const ID_KEY = 'autotek_pendingPaychanguOrderId';
const EMAIL_KEY = 'autotek_pendingPaychanguOrderEmail';
const TIMESTAMP_KEY = 'autotek_pendingPaychanguOrderSetAt';
const GAVE_UP_KEY = 'autotek_pendingPaychanguReconcileGaveUp';

const LEGACY_ID = 'pendingPaychanguOrderId';
const LEGACY_EMAIL = 'pendingPaychanguOrderEmail';

/** Default TTL for treating a pending checkout as "recent" (30 minutes). */
export const PENDING_PAYCHANGU_MAX_AGE_MS = 30 * 60 * 1000;

const PAYCHANGU_REDIRECT_AT_KEY = 'autotek_paychanguRedirectAt';

/** How long after PayChangu redirect we treat the user as possibly returning from gateway. */
export const PAYCHANGU_REDIRECT_WINDOW_MS = 2 * 60 * 1000;

function migrateFromSessionStorage(): void {
  try {
    const sid = sessionStorage.getItem(LEGACY_ID);
    if (!sid) return;
    localStorage.setItem(ID_KEY, sid);
    const em = sessionStorage.getItem(LEGACY_EMAIL);
    if (em) localStorage.setItem(EMAIL_KEY, em);
    else localStorage.removeItem(EMAIL_KEY);
    if (!localStorage.getItem(TIMESTAMP_KEY)) {
      localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
    }
    sessionStorage.removeItem(LEGACY_ID);
    sessionStorage.removeItem(LEGACY_EMAIL);
  } catch {
    /* ignore */
  }
}

export function setPendingPaychanguOrder(orderId: string, guestEmail?: string): void {
  try {
    localStorage.setItem(ID_KEY, orderId);
    localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
    localStorage.removeItem(GAVE_UP_KEY);
    if (guestEmail?.trim()) {
      localStorage.setItem(EMAIL_KEY, guestEmail.trim());
    } else {
      localStorage.removeItem(EMAIL_KEY);
    }
    sessionStorage.removeItem(LEGACY_ID);
    sessionStorage.removeItem(LEGACY_EMAIL);
  } catch {
    /* ignore */
  }
}

export function getPendingPaychanguOrder(): { orderId: string; guestEmail: string } {
  migrateFromSessionStorage();
  try {
    return {
      orderId: localStorage.getItem(ID_KEY) || '',
      guestEmail: localStorage.getItem(EMAIL_KEY) || '',
    };
  } catch {
    return { orderId: '', guestEmail: '' };
  }
}

export function getPendingPaychanguOrderSetAt(): number | null {
  migrateFromSessionStorage();
  try {
    const raw = localStorage.getItem(TIMESTAMP_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function isPendingPaychanguOrderFresh(
  maxAgeMs: number = PENDING_PAYCHANGU_MAX_AGE_MS
): boolean {
  const { orderId } = getPendingPaychanguOrder();
  if (!orderId) return false;
  const setAt = getPendingPaychanguOrderSetAt();
  if (setAt == null) return false;
  return Date.now() - setAt <= maxAgeMs;
}

export function markPendingReconcileGaveUp(): void {
  try {
    localStorage.setItem(GAVE_UP_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasPendingReconcileGaveUp(): boolean {
  try {
    return localStorage.getItem(GAVE_UP_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPendingPaychanguOrder(): void {
  try {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    localStorage.removeItem(GAVE_UP_KEY);
    sessionStorage.removeItem(LEGACY_ID);
    sessionStorage.removeItem(LEGACY_EMAIL);
  } catch {
    /* ignore */
  }
}

export function setPaychanguRedirectAt(): void {
  try {
    sessionStorage.setItem(PAYCHANGU_REDIRECT_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearPaychanguRedirectAt(): void {
  try {
    sessionStorage.removeItem(PAYCHANGU_REDIRECT_AT_KEY);
  } catch {
    /* ignore */
  }
}

export function isRecentPaychanguRedirect(
  maxAgeMs: number = PAYCHANGU_REDIRECT_WINDOW_MS
): boolean {
  try {
    const raw = sessionStorage.getItem(PAYCHANGU_REDIRECT_AT_KEY);
    if (!raw) return false;
    const n = Number(raw);
    if (!Number.isFinite(n)) return false;
    return Date.now() - n <= maxAgeMs;
  } catch {
    return false;
  }
}
