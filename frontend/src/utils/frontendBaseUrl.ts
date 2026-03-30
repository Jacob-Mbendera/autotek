/**
 * Base URL for PayChangu return/cancel redirects and similar.
 * In dev, ensures localhost includes Vite's port when env or origin omits it.
 */
export function getResolvedFrontendBaseUrl(): string {
  const raw = import.meta.env.VITE_BASE_URL?.trim().replace(/\/$/, '');

  const withLocalhostPort = (urlString: string): string => {
    try {
      const u = new URL(urlString.includes('://') ? urlString : `https://${urlString}`);
      if (import.meta.env.DEV && u.hostname === 'localhost' && !u.port) {
        u.port = '5173';
      }
      return u.origin;
    } catch {
      return urlString;
    }
  };

  if (raw) {
    return withLocalhostPort(raw);
  }

  let origin = window.location.origin;
  if (import.meta.env.DEV) {
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost' && !u.port) {
        origin = 'http://localhost:5173';
      }
    } catch {
      /* ignore */
    }
  }
  return origin;
}
