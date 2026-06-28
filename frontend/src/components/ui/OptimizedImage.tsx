import { useState, useEffect, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  /** Tiny LQIP (e.g. data URL) shown until `src` finishes loading */
  blurDataUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * OptimizedImage Component
 *
 * Automatically serves WebP images with responsive sizes and fallbacks
 *
 * Features:
 * - WebP format with fallback to original
 * - Responsive image sizes (400w, 800w, 1200w)
 * - Lazy loading (unless priority)
 * - Optional blur-up placeholder (`blurDataUrl`) while the full image loads
 *
 * Usage:
 * <OptimizedImage
 *   src="/images/products/brake-pad.jpg"
 *   alt="Bosch Brake Pads"
 *   width={300}
 *   height={300}
 *   priority={false}
 * />
 */
export const OptimizedImage = ({
  src,
  alt,
  blurDataUrl,
  width,
  height,
  className = '',
  priority = false,
  sizes = '(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px',
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src, blurDataUrl]);

  /** Cached images may load before React attaches onLoad — treat complete imgs as loaded. */
  const handleImgRef = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, []);

  // Extract base path and extension
  const getImageVariants = (imageSrc: string) => {
    // Check if it's an external URL (Unsplash, etc.)
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      return {
        isExternal: true,
        original: imageSrc,
        webp: null,
        srcSet: null,
      };
    }

    // For local images, generate WebP variants
    const lastDot = imageSrc.lastIndexOf('.');
    const basePath = lastDot > -1 ? imageSrc.substring(0, lastDot) : imageSrc;

    return {
      isExternal: false,
      original: imageSrc,
      webp: `${basePath}.webp`,
      srcSet: `
        ${basePath}-400w.webp 400w,
        ${basePath}-800w.webp 800w,
        ${basePath}-1200w.webp 1200w
      `.trim(),
    };
  };

  const variants = getImageVariants(src);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const showSpinner = isLoading && !blurDataUrl;
  const mainOpacity = isLoading ? 'opacity-0' : 'opacity-100';

  // Fallback placeholder for broken images
  if (hasError) {
    return (
      <div
        className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <svg
          className="h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // External images (Unsplash, etc.) - no optimization
  if (variants.isExternal) {
    return (
      <div className="relative overflow-hidden w-full h-full min-h-0">
        {showSpinner && (
          <div className="absolute inset-0 z-[1] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center animate-pulse">
            <div className="rounded-full h-8 w-8 border-2 border-teal-200 border-t-teal-600 animate-spin" />
          </div>
        )}
        {blurDataUrl && (
          <img
            src={blurDataUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 z-[1] w-full h-full object-cover scale-110 blur-2xl"
          />
        )}
        <img
          ref={handleImgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`relative z-[2] block w-full h-full object-cover ${className} ${mainOpacity} transition-opacity duration-300`}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // Local images with WebP optimization
  return (
    <div className="relative overflow-hidden">
      {showSpinner && (
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center animate-pulse"
          style={{ width, height }}
        >
          <div className="rounded-full h-8 w-8 border-2 border-teal-200 border-t-teal-600 animate-spin" />
        </div>
      )}
      {blurDataUrl && (
        <img
          src={blurDataUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 z-[1] w-full h-full object-cover scale-110 blur-2xl"
        />
      )}
      <picture className="relative z-[2] block">
        {variants.srcSet && (
          <source
            type="image/webp"
            srcSet={variants.srcSet}
            sizes={sizes}
          />
        )}
        {variants.webp && (
          <source
            type="image/webp"
            srcSet={variants.webp}
          />
        )}
        <img
          ref={handleImgRef}
          src={variants.original}
          alt={alt}
          width={width}
          height={height}
          className={`${className} ${mainOpacity} transition-opacity duration-300`}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>
    </div>
  );
};
