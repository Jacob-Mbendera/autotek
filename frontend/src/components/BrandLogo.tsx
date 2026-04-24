import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';
import { BRAND_ASSETS } from '../constants/brandAssets';

export type BrandLogoVariant = 'header' | 'footer' | 'admin' | 'auth';

const VARIANT_SRC: Record<BrandLogoVariant, string> = {
  header: BRAND_ASSETS.logoHorizontalPrimary,
  footer: BRAND_ASSETS.logoMonoTeal,
  admin: BRAND_ASSETS.logoHorizontalOnDark,
  auth: BRAND_ASSETS.logoHorizontalPrimary,
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  /** When set, wraps the image in a router Link */
  to?: string;
  className?: string;
  imgClassName?: string;
}

export function BrandLogo({
  variant = 'header',
  to,
  className,
  imgClassName,
}: BrandLogoProps) {
  const src = VARIANT_SRC[variant];
  const img = (
    <img
      src={src}
      alt="AutoTek"
      className={cn(
        'w-auto object-contain object-left',
        variant === 'footer' ? 'h-6 sm:h-7' : 'h-8',
        imgClassName
      )}
      decoding="async"
      loading={variant === 'header' ? 'eager' : 'lazy'}
    />
  );

  if (to) {
    return (
      <Link to={to} className={cn('inline-flex shrink-0 items-center', className)}>
        {img}
      </Link>
    );
  }

  return <span className={cn('inline-flex shrink-0 items-center', className)}>{img}</span>;
}
