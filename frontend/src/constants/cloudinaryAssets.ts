/** Cloudinary cloud name — must match backend CLOUDINARY_CLOUD_NAME. */
const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dhbe6wtod';

export function cloudinaryImageUrl(publicId: string, transforms?: string): string {
  const segment = transforms ? `${transforms}/` : '';
  const encodedId = publicId.split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${segment}${encodedId}`;
}

export const PLACEHOLDER_PUBLIC_IDS = {
  default: 'autotek/placeholders/default',
  engine: 'autotek/placeholders/engine',
  brakes: 'autotek/placeholders/brakes',
  electrical: 'autotek/placeholders/electrical',
  filters: 'autotek/placeholders/filters',
} as const;

export type PlaceholderKey = keyof typeof PLACEHOLDER_PUBLIC_IDS;

export const MARKETING_PUBLIC_IDS = {
  /** Home hero section — full-width background (subtle, parallax). */
  heroHome: 'autotek/banner-images/HeroMain_aaa9ux',
  /** Home hero section — right-panel feature image (desktop). */
  heroHomeFeature: 'autotek/banner-images/car-service_gvvxmz',
  heroServices: 'autotek/marketing/hero-services',
  categoryDefault: 'autotek/marketing/category-default',
  categoryEngine: 'autotek/marketing/Home/engine_2_nyyvgj',
  categoryBrakes: 'autotek/marketing/Home/brakes_jaebco',
  categoryFilters: 'autotek/marketing/Home/filter_kvavb6',
  categoryElectrical: 'autotek/marketing/Home/electrical_ivejdb',
  offerSpareParts:
    'autotek/marketing/Home/what we offer/high-angle-view-machine-part_76080-113905_yoxjff',
  offerCarServices: 'autotek/marketing/Home/what we offer/service_fun0xh',
  offerEasyShopping: 'autotek/marketing/Home/what we offer/delivery_krq2au',
  /** Services page — hero background and bottom CTA. */
  servicesAtHome: 'autotek/marketing/Home/what we offer/service_2_ulniay',
  /** Services page — towing section feature image. */
  servicesTowing: 'autotek/marketing/Home/what we offer/tow_kxyp4a',
} as const;

export type MarketingImageKey = keyof typeof MARKETING_PUBLIC_IDS;

export function placeholderImageUrl(key: PlaceholderKey, width = 800): string {
  return cloudinaryImageUrl(PLACEHOLDER_PUBLIC_IDS[key], `w_${width},q_auto,f_auto`);
}

export function marketingImageUrl(key: MarketingImageKey, width = 1920): string {
  return cloudinaryImageUrl(MARKETING_PUBLIC_IDS[key], `w_${width},q_auto,f_auto`);
}
