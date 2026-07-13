/**
 * Returns an in-app path safe for client-side redirects.
 * Rejects protocol-relative URLs and absolute external URLs.
 */
export function getSafeRedirectPath(
  path: string | null | undefined,
  fallback = '/'
): string {
  if (!path) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(path);
    if (
      decoded.startsWith('/') &&
      !decoded.startsWith('//') &&
      !decoded.includes('://')
    ) {
      return decoded;
    }
  } catch {
    // Invalid encoding — use fallback
  }

  return fallback;
}
