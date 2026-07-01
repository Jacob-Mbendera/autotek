import type { ProductImageField } from '../store/api/productApi';
import {
  placeholderImageUrl,
  type PlaceholderKey,
} from '../constants/cloudinaryAssets';

export interface ProductDisplayImageResult {
  /** Cloudinary fallback URL — for admin thumbnails; storefront should use ProductPlaceholderImage when isPlaceholder */
  url: string;
  isPlaceholder: boolean;
  /** Category used for placeholder gradient styling */
  placeholderCategory?: string;
}

const PLACEHOLDER_GRADIENTS: Record<PlaceholderKey, string> = {
  default: 'from-teal-600 to-teal-950',
  engine: 'from-teal-700 to-teal-950',
  brakes: 'from-teal-800 to-teal-950',
  electrical: 'from-teal-500 to-teal-900',
  filters: 'from-teal-400 to-teal-800',
};

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

export function hasValidProductImage(images?: ProductImageField[] | null): boolean {
  if (!images?.length) return false;
  return images.some((img) => getProductImageUrl(img).trim() !== '');
}

function categoryToPlaceholderKey(category?: string): PlaceholderKey {
  const cat = category?.toLowerCase().trim() || '';
  if (cat === 'engine parts' || cat === 'filters' || cat === 'cooling system') {
    return 'engine';
  }
  if (cat === 'brake parts' || cat === 'braking system') {
    return 'brakes';
  }
  if (cat === 'electrical' || cat === 'suspension') {
    return 'electrical';
  }
  return 'default';
}

/** Tailwind gradient classes for client-side product-name placeholders (matches static asset palette). */
export function getPlaceholderGradientClass(category?: string): string {
  return PLACEHOLDER_GRADIENTS[categoryToPlaceholderKey(category)];
}

export function getProductPlaceholderUrl(category?: string, width = 800): string {
  return placeholderImageUrl(categoryToPlaceholderKey(category), width);
}

export function resolveProductDisplayImage(
  images?: ProductImageField[] | null,
  category?: string,
  width = 800
): ProductDisplayImageResult {
  const url = getProductImageUrl(getPrimaryProductImage(images));
  if (url.trim()) {
    return { url, isPlaceholder: false };
  }
  return {
    url: getProductPlaceholderUrl(category, width),
    isPlaceholder: true,
    placeholderCategory: category,
  };
}
