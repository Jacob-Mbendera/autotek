import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProductQuery } from '../store/api/productApi';
import { useAppDispatch, useAppSelector } from '../store/types';
import { useCart } from '../hooks/useCart';
import { useGuardedAddToCart } from '../hooks/useGuardedAddToCart';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  ShoppingCart,
  Zap,
  CheckCircle,
  Package,
  Heart,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import { ReviewList } from '../components/ReviewList';
import { ReviewForm } from '../components/ReviewForm';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { ProductPlaceholderImage } from '../components/ProductPlaceholderImage';
import { ProductFitment } from '../components/ProductFitment';
import { getProductImageBlur, getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { JournalCard, JournalButton, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { guardedAddToCart, hasPendingUnpaidOrder } = useGuardedAddToCart();
  const { addItem, clearCart } = useCart();
  const [selectedImage, setSelectedImage] = useState({ productId: id, index: 0 });
  const selectedImageIndex = selectedImage.productId === id ? selectedImage.index : 0;
  const selectImage = (index: number) => setSelectedImage({ productId: id, index });

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetProductQuery(id!);

  // Wishlist functionality
  const { data: wishlistData } = useGetWishlistQuery(undefined, { skip: !isAuthenticated });
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  const isInWishlist = wishlistData?.wishlist?.products?.some((p) => p._id === id) || false;

  const handleAddToCart = () => {
    if (data?.product) {
      guardedAddToCart({
        productId: data.product._id,
        productName: data.product.name,
        price: data.product.price,
        quantity: 1,
        image: getProductImageUrl(data.product.images?.[0]),
      });
    }
  };

  const handleBuyNow = async () => {
    if (data?.product) {
      if (hasPendingUnpaidOrder) {
        dispatch(
          showNotification({
            message:
              'You have a pending unpaid order. Complete or cancel it before starting a new checkout.',
            type: 'warning',
          })
        );
        return;
      }

      // Clear cart and add only this product
      await clearCart();
      await addItem({
        productId: data.product._id,
        productName: data.product.name,
        price: data.product.price,
        quantity: 1,
        image: getProductImageUrl(data.product.images?.[0]),
      });
      navigate('/checkout');
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      dispatch(showNotification({
        message: 'Please log in to add items to your wishlist',
        type: 'info',
      }));
      navigate(`/login?returnUrl=/products/${id}`);
      return;
    }

    if (!data?.product) return;

    try {
      if (isInWishlist) {
        await removeFromWishlist(data.product._id).unwrap();
        dispatch(showNotification({
          message: 'Product removed from wishlist',
          type: 'success',
        }));
      } else {
        await addToWishlist({ productId: data.product._id }).unwrap();
        dispatch(showNotification({
          message: 'Product added to wishlist!',
          type: 'success',
        }));
      }
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Failed to update wishlist');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <JournalBody className="!text-journal-muted">Loading product...</JournalBody>
        </div>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <JournalBody className="!text-journal-danger-text">Product not found.</JournalBody>
          <JournalButton
            variant="secondary"
            className="mt-4"
            onClick={() => navigate('/products')}
          >
            Back to products
          </JournalButton>
        </div>
      </div>
    );
  }

  const product = data.product;
  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= 10;
  const { isPlaceholder: usingPlaceholderOnly } = resolveProductDisplayImage(
    product.images,
    product.category
  );
  const hasValidImage = !usingPlaceholderOnly;

  let displayEntries: { url: string; blurDataUrl?: string }[];
  if (hasValidImage && product.images && product.images.length > 0) {
    displayEntries = product.images.map((img) => ({
      url: getProductImageUrl(img),
      blurDataUrl: getProductImageBlur(img),
    }));
  } else {
    displayEntries = [];
  }

  const isPlaceholder = usingPlaceholderOnly;

  const safeImageIndex = Math.min(selectedImageIndex, Math.max(displayEntries.length - 1, 0));
  const currentEntry = displayEntries[safeImageIndex];

  // Generate SKU from product ID
  const generateSKU = (productId: string, category: string) => {
    const categoryCode = category
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3);
    const idSuffix = productId.slice(-6).toUpperCase();
    return `ATK-${categoryCode}-${idSuffix}`;
  };

  const sku = generateSKU(product._id, product.category);

  const stockBadge = isOutOfStock
    ? { label: 'Out of stock', className: 'bg-journal-danger-bg text-journal-danger-text' }
    : isLowStock
      ? { label: 'Low stock', className: 'bg-journal-warn-bg text-journal-warn-text' }
      : { label: 'In stock', className: 'bg-journal-teal-tint text-journal-teal' };

  // Get benefits based on category or default
  const getBenefits = () => {
    const categoryBenefits: Record<string, string[]> = {
      'Brake Parts': [
        'Low-dust formula keeps wheels clean longer',
        'Dual-layer shim design for quiet operation',
        'Engineered for Malawian road conditions',
      ],
      'Engine Parts': [
        'Premium quality materials for durability',
        'Application details shown separately when available',
        'Designed for optimal performance',
      ],
      'Electrical': [
        'Reliable performance in all conditions',
        'Easy installation process',
        'Product specifications available before purchase',
      ],
      'Suspension': [
        'Enhanced ride comfort',
        'Durable construction',
        'Easy to install',
      ],
    };

    return (
      categoryBenefits[product.category] || [
        'Premium quality materials',
        'Designed for durability',
        'Fitment guidance available when listed',
      ]
    );
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
    { label: product.name },
  ];
  const alternatePartNumbers = product.alternatePartNumbers ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Main Product Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative bg-journal-sand border border-journal-hairline overflow-hidden" style={{ minHeight: '500px' }}>
            {isPlaceholder ? (
              <ProductPlaceholderImage
                productName={product.name}
                category={product.category}
                size="lg"
                className="h-[500px] w-full"
              />
            ) : currentEntry?.url ? (
              <OptimizedImage
                key={`${product._id}-${currentEntry.url}`}
                src={currentEntry.url}
                blurDataUrl={currentEntry.blurDataUrl}
                alt={product.name}
                width={800}
                height={500}
                className="w-full h-[500px] object-cover"
                priority={true}
              />
            ) : (
              <div className="w-full h-[500px] flex items-center justify-center bg-journal-sand">
                <Package className="h-14 w-14 text-journal-faint" />
              </div>
            )}
            {/* Placeholder indicator */}
            {isPlaceholder && (
              <div className="absolute top-4 right-4 z-10">
                <span className="bg-white/90 rounded-full px-3 py-1 text-[11px] font-sans font-medium text-journal-muted border border-journal-hairline">
                  Placeholder
                </span>
              </div>
            )}
            {/* Image carousel indicator */}
            {displayEntries.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {displayEntries.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => selectImage(index)}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      selectedImageIndex === index ? 'w-8 bg-journal-teal' : 'w-2 bg-white/60 hover:bg-white/80'
                    )}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
          {displayEntries.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {displayEntries.slice(0, 4).map((entry, index) => (
                <button
                  key={index}
                  onClick={() => selectImage(index)}
                  className={cn(
                    'aspect-square bg-journal-sand overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border',
                    selectedImageIndex === index ? 'border-journal-teal' : 'border-journal-hairline'
                  )}
                >
                  <OptimizedImage
                    src={entry.url}
                    blurDataUrl={entry.blurDataUrl}
                    alt={`${product.name} ${index + 1}`}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                    priority={index === 0}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <PageHeading className="!text-[32px] sm:!text-[38px] mb-4">{product.name}</PageHeading>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <span className="font-journal text-[34px] text-journal-ink">
                MWK {product.price.toLocaleString()}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 font-sans font-semibold text-[11px] tracking-[0.06em] uppercase',
                  stockBadge.className
                )}
              >
                {stockBadge.label}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <JournalBody className="whitespace-pre-line">
              {product.description}
            </JournalBody>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5 border border-journal-hairline rounded-journal p-3">
              <ShieldCheck className="h-4 w-4 text-journal-teal flex-shrink-0 mt-0.5" />
              <span className="text-[12px] font-sans text-journal-body leading-snug">Genuine / OEM-spec part</span>
            </div>
            <div className="flex items-start gap-2.5 border border-journal-hairline rounded-journal p-3">
              <Truck className="h-4 w-4 text-journal-teal flex-shrink-0 mt-0.5" />
              <span className="text-[12px] font-sans text-journal-body leading-snug">Nationwide delivery in 2–4 days</span>
            </div>
            <div className="flex items-start gap-2.5 border border-journal-hairline rounded-journal p-3">
              <Wrench className="h-4 w-4 text-journal-teal flex-shrink-0 mt-0.5" />
              <span className="text-[12px] font-sans text-journal-body leading-snug">Fitment help from our mechanics</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <JournalButton
              variant="secondary"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-4 w-4" />
              Add to cart
            </JournalButton>
            <JournalButton
              variant="primary"
              className="flex-1"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              <Zap className="h-4 w-4" />
              Buy now
            </JournalButton>
            <button
              onClick={handleWishlistToggle}
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className={cn(
                'inline-flex items-center justify-center px-4 py-3 border transition-colors',
                isInWishlist
                  ? 'bg-journal-ink text-journal-bone border-journal-ink'
                  : 'border-journal-ink text-journal-ink hover:bg-journal-ink hover:text-journal-bone'
              )}
            >
              <Heart className={cn('h-4 w-4', isInWishlist ? 'fill-current' : '')} />
            </button>
          </div>
        </div>
      </div>

      <ProductFitment product={product} onRequestPart={() => navigate('/request-part')} />

      {/* Technical Specifications */}
      <JournalCard className="mb-8">
        <CardHeading className="!text-[22px] mb-6">Technical specifications</CardHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div className="flex justify-between py-3 border-b border-journal-hairline">
            <span className="font-sans font-semibold text-[13px] text-journal-ink">Brand</span>
            <span className="font-sans text-[13px] text-journal-muted">{product.brand || 'Not specified'}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-journal-hairline">
            <span className="font-sans font-semibold text-[13px] text-journal-ink">SKU</span>
            <span className="font-sans text-[13px] text-journal-muted">{sku}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-journal-hairline">
            <span className="font-sans font-semibold text-[13px] text-journal-ink">Material</span>
            <span className="font-sans text-[13px] text-journal-muted">
              {product.description.toLowerCase().includes('ceramic')
                ? 'Premium Ceramic'
                : product.description.toLowerCase().includes('organic')
                ? 'Organic'
                : product.description.toLowerCase().includes('semi-metallic')
                ? 'Semi-Metallic'
                : 'Premium Quality'}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-journal-hairline">
            <span className="font-sans font-semibold text-[13px] text-journal-ink">OEM part number</span>
            <span className="font-sans text-[13px] text-journal-muted">{product.oemPartNumber || 'Not specified'}</span>
          </div>
          {alternatePartNumbers.length > 0 && (
            <div className="flex justify-between gap-6 py-3 border-b border-journal-hairline">
              <span className="font-sans font-semibold text-[13px] text-journal-ink">Alternate part numbers</span>
              <span className="font-sans text-[13px] text-journal-muted text-right">{alternatePartNumbers.join(', ')}</span>
            </div>
          )}
        </div>
      </JournalCard>

      {/* Why Choose This Part? */}
      <JournalCard className="mb-8">
        <CardHeading className="!text-[22px] mb-6">Why choose this part?</CardHeading>
        <div className="space-y-4">
          {getBenefits().map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-journal-teal flex-shrink-0 mt-0.5" />
              <JournalBody>{benefit}</JournalBody>
            </div>
          ))}
        </div>
      </JournalCard>

      {/* Reviews Section */}
      <div className="mb-8">
        <CardHeading className="!text-[22px] mb-6">Customer reviews</CardHeading>
        <div className="space-y-8">
          <ReviewForm productId={id!} />
          <ReviewList productId={id!} />
        </div>
      </div>
    </div>
  );
};
