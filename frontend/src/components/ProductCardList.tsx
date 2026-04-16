import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Sparkles, Package, Heart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { addItem } from '../store/slices/cartSlice';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import type { Product } from '../store/api/productApi';
import { Button } from './ui/Button';
import { OptimizedImage } from './ui/OptimizedImage';
import { getProductImageBlur, getProductImageUrl } from '../utils/productImage';

interface ProductCardListProps {
  product: Product;
}

export const ProductCardList = ({ product }: ProductCardListProps) => {
  const dispatch = useAppDispatch();
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

  const firstImageUrl = getProductImageUrl(product.images?.[0]);
  const hasValidImage = Boolean(firstImageUrl.trim());

  const getPlaceholderImage = () => {
    const category = product.category?.toLowerCase() || '';
    const placeholders: Record<string, string> = {
      'engine parts': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'brake parts': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'braking system': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'filters': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'electrical': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'suspension': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
    };
    return placeholders[category] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80';
  };

  const displayImage = hasValidImage ? firstImageUrl : getPlaceholderImage();
  const isPlaceholder = !hasValidImage;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dispatch(
      addItem({
        productId: product._id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        image: getProductImageUrl(product.images?.[0]),
      })
    );
    dispatch(showNotification({ message: 'Product added to cart!', type: 'success' }));
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

  const getStatusBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg border-2 border-white">
          OUT OF STOCK
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg border-2 border-white">
          LOW STOCK
        </span>
      );
    }
    return (
      <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg border-2 border-white">
        IN STOCK
      </span>
    );
  };

  const brand = product.supplier || 'UNIVERSAL';
  const categoryDisplay = product.category.toUpperCase();

  return (
    <Link
      to={`/products/${product._id}`}
      className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-teal-300 relative flex flex-row"
    >
      {/* Image section */}
      <div className="relative w-48 h-48 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <div
          className={`w-full h-full group-hover:scale-110 transition-transform duration-500 ${
            isPlaceholder ? 'opacity-80' : ''
          }`}
        >
          <OptimizedImage
            src={displayImage}
            blurDataUrl={hasValidImage ? getProductImageBlur(product.images?.[0]) : undefined}
            alt={product.name}
            width={192}
            height={192}
            className="w-full h-full object-cover"
            priority={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
        
        {isPlaceholder && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200">
              Placeholder
            </div>
          </div>
        )}
        
        <div className="absolute top-2 left-2 z-10">
          {getStatusBadge()}
        </div>
      </div>
      
      {/* Content section */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs font-bold text-teal-600 uppercase tracking-wide">
              {brand}
            </div>
            <span className="text-gray-300">•</span>
            <div className="text-xs font-medium text-gray-500">
              {categoryDisplay}
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors duration-300">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
              MWK {product.price.toLocaleString()}
            </span>
            {product.stock > 0 && (
              <span className="text-sm text-gray-500">
                ({product.stock} in stock)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={handleWishlistToggle}
                disabled={isAddingToWishlist}
                className={`p-2 rounded-lg transition-all ${
                  isInWishlist
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${isAddingToWishlist ? 'opacity-70 cursor-wait' : ''}`}
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''} ${isAddingToWishlist ? 'animate-pulse' : ''}`} />
              </button>
            )}
            <Button
              variant="primary"
              size="default"
              className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};
