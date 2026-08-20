import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { useCart } from '../hooks/useCart';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import type { Product } from '../store/api/productApi';
import type { VehicleFitmentMatchStrength } from '@shared/utils/productFitmentMatch';
import { OptimizedImage } from './ui/OptimizedImage';
import { getProductImageBlur, getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { ProductPlaceholderImage } from './ProductPlaceholderImage';
import { JournalButton, MonoLabel } from './journal';
import { cn } from '../utils/cn';

interface ProductCardListProps {
  product: Product;
  fitmentMatch?: VehicleFitmentMatchStrength;
}

export const ProductCardList = ({ product, fitmentMatch = 'none' }: ProductCardListProps) => {
  const dispatch = useAppDispatch();
  const { addItem } = useCart();
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [optimisticWishlistState, setOptimisticWishlistState] = useState<boolean | null>(null);

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data: wishlistData } = useGetWishlistQuery(undefined, { skip: !isAuthenticated });
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  const isInWishlistFromAPI = wishlistData?.wishlist?.products?.some((p) => p._id === product._id) || false;
  // Use optimistic state if available, otherwise use API state
  const isInWishlist = optimisticWishlistState !== null ? optimisticWishlistState : isInWishlistFromAPI;

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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const success = await addItem({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: getProductImageUrl(product.images?.[0]),
    });
    if (success) {
      dispatch(showNotification({ message: 'Product added to cart!', type: 'success' }));
    }
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
      dispatch(showNotification({
        message: error.data?.message || 'Failed to update wishlist',
        type: 'error',
      }));
    } finally {
      setIsAddingToWishlist(false);
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
    <Link
      to={`/products/${product._id}`}
      className="group bg-white border border-journal-hairline rounded-journal overflow-hidden hover:border-journal-ink transition-colors relative flex flex-row"
    >
      {/* Image section */}
      <div className="relative w-40 sm:w-48 flex-shrink-0 bg-journal-sand overflow-hidden">
        {isPlaceholder ? (
          <ProductPlaceholderImage
            productName={product.name}
            category={product.category}
            size="md"
            className="w-full h-full"
          />
        ) : (
          <OptimizedImage
            src={getProductImageUrl(product.images?.[0])}
            blurDataUrl={getProductImageBlur(product.images?.[0])}
            alt={product.name}
            width={192}
            height={192}
            className="w-full h-full object-cover"
            priority={false}
          />
        )}

        {isPlaceholder && (
          <div className="absolute top-2 right-2 z-10">
            <span className="bg-white/90 rounded-full px-2 py-1 text-[10px] font-sans font-medium text-journal-muted border border-journal-hairline">
              Placeholder
            </span>
          </div>
        )}

        <div className="absolute top-2 left-2 z-10">
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
          <div className="absolute bottom-2 left-2 z-10">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-1 font-sans font-semibold text-[10px]',
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
      </div>

      {/* Content section */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <MonoLabel className="!text-journal-teal">{brand}</MonoLabel>
            <span className="text-journal-hairline">&#183;</span>
            <span className="text-[11px] font-sans text-journal-faint">{categoryDisplay}</span>
          </div>

          <h3 className="font-journal text-[19px] leading-snug text-journal-ink mb-2 group-hover:text-journal-teal transition-colors">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-[13px] font-sans text-journal-body mb-4 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-journal text-[24px] text-journal-ink">
              MWK {product.price.toLocaleString()}
            </span>
            {product.stock > 0 && (
              <span className="text-[12px] font-sans text-journal-faint">
                ({product.stock} in stock)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isAuthenticated && (
              <button
                onClick={handleWishlistToggle}
                disabled={isAddingToWishlist}
                className={cn(
                  'p-2 rounded-journal border transition-colors',
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
            <JournalButton
              variant="primary"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {isOutOfStock ? 'Out of stock' : 'Add to cart'}
            </JournalButton>
          </div>
        </div>
      </div>
    </Link>
  );
};
