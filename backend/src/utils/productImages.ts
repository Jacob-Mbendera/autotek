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

/**
 * Move the image matching `targetUrl` to index 0 (primary / cover).
 * Preserves each entry's stored shape (string or object).
 */
export function moveImageToPrimary(images: unknown[], targetUrl: string): ProductImageStored[] {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Product has no images');
  }

  const trimmed = targetUrl.trim();
  if (!trimmed) {
    throw new Error('Image URL is required');
  }

  let matchIndex = -1;
  for (let i = 0; i < images.length; i++) {
    if (getImageUrl(images[i]) === trimmed) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex < 0) {
    throw new Error('Image URL not found on this product');
  }

  if (matchIndex === 0) {
    return images as ProductImageStored[];
  }

  const reordered = [...images];
  const [match] = reordered.splice(matchIndex, 1);
  reordered.unshift(match);
  return reordered as ProductImageStored[];
}
