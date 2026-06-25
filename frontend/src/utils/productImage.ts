import type { ProductImageField } from '../store/api/productApi';

export function getPrimaryProductImage(images?: ProductImageField[] | null): ProductImageField | null {
  return images?.[0] ?? null;
}

export function getProductImageUrl(image: ProductImageField | undefined | null): string {
  if (image == null) return '';
  if (typeof image === 'string') return image;
  return image.url || '';
}

export function getProductImageBlur(image: ProductImageField | undefined | null): string | undefined {
  if (image == null || typeof image === 'string') return undefined;
  return image.blurDataUrl;
}
