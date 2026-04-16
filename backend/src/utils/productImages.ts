/**
 * Product image entries in MongoDB may be legacy plain URL strings or
 * `{ url, blurDataUrl? }` objects. Normalize at API boundaries.
 */
export type ProductImageStored = string | { url: string; blurDataUrl?: string };

export function normalizeProductImage(raw: unknown): { url: string; blurDataUrl?: string } {
  if (typeof raw === 'string') {
    return { url: raw };
  }
  if (raw && typeof raw === 'object' && typeof (raw as { url?: unknown }).url === 'string') {
    const r = raw as { url: string; blurDataUrl?: unknown };
    const out: { url: string; blurDataUrl?: string } = { url: r.url };
    if (typeof r.blurDataUrl === 'string' && r.blurDataUrl.length > 0) {
      out.blurDataUrl = r.blurDataUrl;
    }
    return out;
  }
  return { url: '' };
}

export function getImageUrl(stored: ProductImageStored | unknown): string {
  return normalizeProductImage(stored).url;
}
