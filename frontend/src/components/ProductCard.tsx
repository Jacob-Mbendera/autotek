import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Star, Heart, GitCompare } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { useGuardedAddToCart } from '../hooks/useGuardedAddToCart';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { addToComparison } from '../store/slices/comparisonSlice';
import type { Product } from '../store/api/productApi';
import type { VehicleFitmentMatchStrength } from '@shared/utils/productFitmentMatch';
import { getProductImageBlur, getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { OptimizedImage } from './ui/OptimizedImage';
import { ProductPlaceholderImage } from './ProductPlaceholderImage';
import { JournalButton, MonoLabel } from './journal';
import { cn } from '../utils/cn';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void | Promise<void>;
  fitmentMatch?: VehicleFitmentMatchStrength;
}

export const ProductCard = ({ product, onQuickView, onAddToCart, fitmentMatch = 'none' }: ProductCardProps) => {
  const dispatch = useAppDispatch();
  const { guardedAddToCart } = useGuardedAddToCart();
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [optimisticWishlistState, setOptimisticWishlistState] = useState<boolean | null>(null);

  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const { data: wishlistData } = useGetWishlistQuery(undefined, { skip: !isAuthenticated });
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const { products: comparisonProducts, maxProducts } = useAppSelector((state) => state.comparison);

  const isInWishlistFromAPI = wishlistData?.wishlist?.products?.some((p) => p._id === product._id) || false;
  // Use optimistic state if available, otherwise use API state
  const isInWishlist = optimisticWishlistState !== null ? optimisticWishlistState : isInWishlistFromAPI;
  const isInComparison = comparisonProducts.some((p) => p._id === product._id);
  const canAddToComparison = !isInComparison && comparisonProducts.length < maxProducts;

  // Reset optimistic state when API data changes
  useEffect(() => {
    if (optimisticWishlistState !== null && optimisticWishlistState === isInWishlistFromAPI) {
      setOptimisticWishlistState(null);
    }
  }, [isInWishlistFromAPI, optimisticWishlistState]);

  const { isPlaceholder } = resolveProductDisplayImage(
    product.images,
    product.category
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onAddToCart) {
      onAddToCart(product);
      return;
    }

    guardedAddToCart({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: getProductImageUrl(product.images?.[0]),
    });
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      dispatch(showNotification({
        message: 'Please log in to add items to your wishlist',
        type: 'info',
      }));
      return;
    }

    // Prevent multiple rapid clicks
    if (isAddingToWishlist) return;

    // Optimistically update the UI immediately
    const newWishlistState = !isInWishlist;
    setOptimisticWishlistState(newWishlistState);
    setIsAddingToWishlist(true);

    try {
      if (isInWishlist) {
        await removeFromWishlist(product._id).unwrap();
        dispatch(showNotification({
          message: 'Product removed from wishlist',
          type: 'success',
        }));
      } else {
        await addToWishlist({ productId: product._id }).unwrap();
        dispatch(showNotification({
          message: 'Product added to wishlist!',
          type: 'success',
        }));
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setOptimisticWishlistState(!newWishlistState);
      const errorInfo = getErrorInfo(error, 'Failed to update wishlist');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleAddToComparison = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (canAddToComparison) {
      dispatch(addToComparison(product));
    }
  };

  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= 10;

  const stockBadge = isOutOfStock
    ? { label: 'Out of stock', className: 'bg-journal-danger-bg text-journal-danger-text' }
    : isLowStock
      ? { label: 'Low stock', className: 'bg-journal-warn-bg text-journal-warn-text' }
      : { label: 'In stock', className: 'bg-journal-teal-tint text-journal-teal' };

  const brand = product.brand || product.supplier || 'Brand not listed';
  const categoryDisplay = product.category.toUpperCase();

  return (
    <div className="group relative bg-white border border-journal-hairline rounded-journal overflow-hidden hover:border-journal-ink transition-colors">
      <Link to={`/products/${product._id}`} className="block">
        {/* Image */}
        <div className="relative aspect-square bg-journal-sand overflow-hidden">
          {isPlaceholder ? (
            <ProductPlaceholderImage
              productName={product.name}
              category={product.category}
              size="md"
              className="h-full w-full"
            />
          ) : (
            <OptimizedImage
              src={getProductImageUrl(product.images?.[0])}
              blurDataUrl={getProductImageBlur(product.images?.[0])}
              alt={product.name}
              width={400}
              height={400}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              priority={false}
            />
          )}

          {isPlaceholder && (
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-white/90 rounded-full px-2 py-1 text-[10px] font-sans font-medium text-journal-muted border border-journal-hairline">
                Placeholder
              </span>
            </div>
          )}

          <div className="absolute top-3 left-3 z-10">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 font-sans font-semibold text-[10px] tracking-[0.06em] uppercase',
                stockBadge.className
              )}
            >
              {stockBadge.label}
            </span>
          </div>

          {fitmentMatch !== 'none' && (
            <div className="absolute bottom-3 left-3 z-10">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 font-sans font-semibold text-[10px] tracking-[0.04em]',
                  fitmentMatch === 'strong'
                    ? 'bg-journal-teal-tint text-journal-teal'
                    : fitmentMatch === 'universal'
                      ? 'bg-journal-sand text-journal-ink'
                      : 'bg-journal-warn-bg text-journal-warn-text'
                )}
              >
                {fitmentMatch === 'strong'
                  ? 'Fits your vehicle'
                  : fitmentMatch === 'universal'
                    ? 'Universal part'
                    : 'Check year/engine'}
              </span>
            </div>
          )}

          {product.badge && (
            <div className="absolute bottom-3 right-3 z-10">
              <span className="bg-journal-ink text-journal-bone px-2.5 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.06em]">
                {product.badge}
              </span>
            </div>
          )}

          {/* Quick actions on hover */}
          <div className="absolute top-14 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 flex flex-col gap-2">
            {canAddToComparison && (
              <button
                onClick={handleAddToComparison}
                className="bg-white rounded-full p-2 shadow border border-journal-hairline hover:border-journal-ink text-journal-body hover:text-journal-teal transition-colors"
                aria-label="Add to comparison"
                title="Add to comparison"
              >
                <GitCompare className="h-4 w-4" />
              </button>
            )}
            {onQuickView && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView(product);
                }}
                className="bg-white rounded-full p-2 shadow border border-journal-hairline hover:border-journal-ink text-journal-teal transition-colors"
                aria-label="Quick view"
                title="Quick view"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <MonoLabel className="!text-journal-teal">{brand}</MonoLabel>
            <span className="text-journal-hairline">&#183;</span>
            <span className="text-[11px] font-sans text-journal-faint">{categoryDisplay}</span>
          </div>

          <h3 className="font-journal text-[17px] leading-snug text-journal-ink mb-2 line-clamp-2 group-hover:text-journal-teal transition-colors">
            {product.name}
          </h3>

          {product.averageRating !== undefined && product.averageRating > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-3.5 w-3.5',
                      star <= Math.round(product.averageRating ?? 0)
                        ? 'fill-journal-teal text-journal-teal'
                        : 'fill-journal-star-empty text-journal-star-empty'
                    )}
                  />
                ))}
              </div>
              <span className="text-[12px] font-sans text-journal-muted">
                {product.averageRating.toFixed(1)} ({product.reviewCount || 0})
              </span>
            </div>
          )}

          {product.description && (
            <p className="text-[13px] font-sans text-journal-body mb-3 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="mb-4 flex items-baseline gap-2">
            <span className="font-journal text-[22px] text-journal-ink">
              MWK {product.price.toLocaleString()}
            </span>
            {product.stock > 0 && (
              <span className="text-[12px] font-sans text-journal-faint">
                ({product.stock} in stock)
              </span>
            )}
          </div>

          <JournalButton
            variant="primary"
            className="w-full"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isOutOfStock ? 'Out of stock' : 'Add to cart'}
          </JournalButton>
        </div>
      </Link>

      {isAuthenticated && (
        <button
          onClick={handleWishlistToggle}
          disabled={isAddingToWishlist}
          className={cn(
            'absolute top-3 right-3 z-50 bg-white rounded-full p-2 shadow border transition-colors',
            isInWishlist
              ? 'border-journal-error-border-strong text-journal-danger-text'
              : 'border-journal-hairline text-journal-body hover:border-journal-ink',
            isAddingToWishlist ? 'opacity-70 cursor-wait' : ''
          )}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={cn('h-4 w-4', isInWishlist ? 'fill-current' : '')} />
        </button>
      )}
    </div>
  );
};
