import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingCart, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGuardedAddToCart } from '../hooks/useGuardedAddToCart';
import type { Product } from '../store/api/productApi';
import { JournalButton, CardHeading, JournalBody } from './journal';
import { OptimizedImage } from './ui/OptimizedImage';
import { getProductImageBlur, getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { ProductPlaceholderImage } from './ProductPlaceholderImage';
import { cn } from '../utils/cn';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickViewModal = ({ product, isOpen, onClose }: QuickViewModalProps) => {
  const { guardedAddToCart } = useGuardedAddToCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen && product) {
      setCurrentImageIndex(0);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [];
  const hasMultipleImages = images.length > 1;
  const currentEntry = images[currentImageIndex];
  const resolvedImage = currentEntry
    ? { url: getProductImageUrl(currentEntry), isPlaceholder: false }
    : resolveProductDisplayImage(product.images, product.category);
  const showPlaceholder = resolvedImage.isPlaceholder;
  const currentImageUrl = resolvedImage.url;
  const currentBlur = currentEntry ? getProductImageBlur(currentEntry) : undefined;

  const handleAddToCart = () => {
    guardedAddToCart({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: getProductImageUrl(product.images?.[0]),
    });
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= 10;
  const brand = product.brand || product.supplier || 'Brand not listed';
  const categoryDisplay = product.category.toUpperCase();

  const stockBadge = isOutOfStock
    ? { label: 'Out of stock', className: 'bg-journal-danger-bg text-journal-danger-text' }
    : isLowStock
      ? { label: 'Low stock', className: 'bg-journal-warn-bg text-journal-warn-text' }
      : { label: 'In stock', className: 'bg-journal-teal-tint text-journal-teal' };

  return (
    <div
      className="fixed inset-0 bg-journal-ink/70 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-journal-ink rounded-journal max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="relative bg-journal-sand overflow-hidden">
            <div className="relative aspect-square">
              {showPlaceholder ? (
                <ProductPlaceholderImage
                  productName={product.name}
                  category={product.category}
                  size="lg"
                  className="aspect-square w-full"
                />
              ) : (
                <OptimizedImage
                  src={currentImageUrl}
                  blurDataUrl={currentBlur}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="w-full h-full object-cover"
                  priority={true}
                />
              )}

              {/* Image Navigation */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 border border-journal-hairline hover:border-journal-ink transition-colors z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4 text-journal-ink" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 border border-journal-hairline hover:border-journal-ink transition-colors z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4 text-journal-ink" />
                  </button>

                  {/* Image Indicators */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={cn(
                          'h-2 rounded-full transition-all',
                          index === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
                        )}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 font-sans font-semibold text-[10px] tracking-[0.06em] uppercase',
                    stockBadge.className
                  )}
                >
                  {stockBadge.label}
                </span>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {hasMultipleImages && images.length > 1 && (
              <div className="p-4 bg-white border-t border-journal-hairline flex gap-2 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'flex-shrink-0 w-16 h-16 rounded-journal overflow-hidden border transition-colors',
                      index === currentImageIndex ? 'border-journal-teal' : 'border-journal-hairline hover:border-journal-ink'
                    )}
                  >
                    <OptimizedImage
                      src={getProductImageUrl(img)}
                      blurDataUrl={getProductImageBlur(img)}
                      alt={`${product.name} view ${index + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      priority={false}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-6 flex flex-col">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="ml-auto mb-4 p-2 hover:bg-journal-sand rounded-journal transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4 text-journal-body" />
            </button>

            {/* Brand & Category */}
            <div className="flex items-center gap-2 mb-3">
              <div className="text-[11px] font-sans font-bold text-journal-teal uppercase tracking-[0.08em]">
                {brand}
              </div>
              <span className="text-journal-hairline">&#183;</span>
              <div className="text-[11px] font-sans font-medium text-journal-faint">
                {categoryDisplay}
              </div>
            </div>

            {/* Product Name */}
            <CardHeading className="!text-[26px] mb-4">
              {product.name}
            </CardHeading>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="font-journal text-[36px] text-journal-ink">
                  MWK {product.price.toLocaleString()}
                </span>
                {product.stock > 0 && (
                  <span className="text-[13px] font-sans text-journal-faint">
                    ({product.stock} in stock)
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h4 className="text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-2">Description</h4>
                <JournalBody>{product.description}</JournalBody>
              </div>
            )}

            {/* Product Details */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-2 text-[13px] font-sans">
                <Package className="h-4 w-4 text-journal-faint" />
                <span className="text-journal-muted">Category:</span>
                <span className="font-medium text-journal-ink">{product.category}</span>
              </div>
              {product.supplier && (
                <div className="flex items-center gap-2 text-[13px] font-sans">
                  <span className="text-journal-muted">Supplier:</span>
                  <span className="font-medium text-journal-ink">{product.supplier}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3">
              <JournalButton
                variant="primary"
                size="large"
                className="w-full"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart className="h-4 w-4" />
                {isOutOfStock ? 'Out of stock' : 'Add to cart'}
              </JournalButton>

              <Link to={`/products/${product._id}`} onClick={onClose}>
                <JournalButton
                  variant="secondary"
                  size="large"
                  className="w-full"
                >
                  View full details
                </JournalButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
