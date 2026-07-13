export type ClientSyncScope = 'wishlist' | 'orders' | 'products';

const SYNC_STORAGE_KEY = 'autotek_client_sync';
export const CLIENT_SYNC_EVENT = 'autotek-client-sync';

export interface ClientSyncPayload {
  wishlist?: number;
  orders?: number;
  products?: number;
}

function readSyncPayload(): ClientSyncPayload {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ClientSyncPayload;
  } catch {
    return {};
  }
}

/** Notify other tabs (storage) and same-tab listeners (custom event). */
export function broadcastClientSync(scope: ClientSyncScope): void {
  if (typeof window === 'undefined') return;

  try {
    const next: ClientSyncPayload = {
      ...readSyncPayload(),
      [scope]: Date.now(),
    };
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CLIENT_SYNC_EVENT, { detail: { scope } }));
  } catch {
    /* ignore */
  }
}

export function subscribeClientSync(
  handler: (scope: ClientSyncScope) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SYNC_STORAGE_KEY) return;

    let oldPayload: ClientSyncPayload = {};
    let newPayload: ClientSyncPayload = {};
    try {
      if (event.oldValue) oldPayload = JSON.parse(event.oldValue);
      if (event.newValue) newPayload = JSON.parse(event.newValue);
    } catch {
      return;
    }

    if (newPayload.wishlist !== oldPayload.wishlist) handler('wishlist');
    if (newPayload.orders !== oldPayload.orders) handler('orders');
    if (newPayload.products !== oldPayload.products) handler('products');
  };

  const onCustom = (event: Event) => {
    const scope = (event as CustomEvent<{ scope?: ClientSyncScope }>).detail?.scope;
    if (scope === 'wishlist' || scope === 'orders' || scope === 'products') {
      handler(scope);
    }
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(CLIENT_SYNC_EVENT, onCustom);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CLIENT_SYNC_EVENT, onCustom);
  };
}

export const PERSIST_ROOT_KEY = 'persist:root';

export interface ParsedPersistSlices {
  auth: { user: unknown; token: string | null; isAuthenticated: boolean } | null;
  cart: Record<string, unknown> | null;
  comparison: { products: unknown[]; maxProducts: number } | null;
}

export function parsePersistRoot(raw: string | null): ParsedPersistSlices | null {
  if (!raw) return null;

  try {
    const root = JSON.parse(raw) as Record<string, string>;
    const result: ParsedPersistSlices = {
      auth: null,
      cart: null,
      comparison: null,
    };

    if (root.auth) {
      result.auth = JSON.parse(root.auth);
    }
    if (root.cart) {
      result.cart = JSON.parse(root.cart);
    }
    if (root.comparison) {
      result.comparison = JSON.parse(root.comparison);
    }

    return result;
  } catch {
    return null;
  }
}
