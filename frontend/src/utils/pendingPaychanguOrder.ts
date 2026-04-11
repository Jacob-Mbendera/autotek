/**
 * Persist pending product-checkout order across tab close (e.g. user pays on PayChangu
 * but closes before the browser redirect to /payment/success).
 * sessionStorage is tied to the tab and is lost when that tab is closed.
 */
const ID_KEY = 'autotek_pendingPaychanguOrderId';
const EMAIL_KEY = 'autotek_pendingPaychanguOrderEmail';

const LEGACY_ID = 'pendingPaychanguOrderId';
const LEGACY_EMAIL = 'pendingPaychanguOrderEmail';

function migrateFromSessionStorage(): void {
  try {
    const sid = sessionStorage.getItem(LEGACY_ID);
    if (!sid) return;
    localStorage.setItem(ID_KEY, sid);
    const em = sessionStorage.getItem(LEGACY_EMAIL);
    if (em) localStorage.setItem(EMAIL_KEY, em);
    else localStorage.removeItem(EMAIL_KEY);
    sessionStorage.removeItem(LEGACY_ID);
    sessionStorage.removeItem(LEGACY_EMAIL);
  } catch {
    /* ignore */
  }
}

export function setPendingPaychanguOrder(orderId: string, guestEmail?: string): void {
  try {
    localStorage.setItem(ID_KEY, orderId);
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

export function clearPendingPaychanguOrder(): void {
  try {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(EMAIL_KEY);
    sessionStorage.removeItem(LEGACY_ID);
    sessionStorage.removeItem(LEGACY_EMAIL);
  } catch {
    /* ignore */
  }
}
