import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Star, Sparkles, Package, Heart, GitCompare, Tag, Award, Zap } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { addItem } from '../store/slices/cartSlice';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { addToComparison } from '../store/slices/comparisonSlice';
import type { Product } from '../store/api/productApi';
import { Button } from './ui/Button';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export const ProductCard = ({ product, onQuickView }: ProductCardProps) => {
  const dispatch = useAppDispatch();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
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

  // Check if product has valid images - more lenient check
  const firstImage = product.images?.[0];
  const hasValidImage = firstImage && 
    typeof firstImage === 'string' && 
    firstImage.trim() !== '' &&
    !imageError;

  // Reset image state when product changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [product._id, firstImage]);

  // Default placeholder image based on category
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

  const displayImage = hasValidImage ? firstImage : getPlaceholderImage();
  const isPlaceholder = !hasValidImage;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dispatch(
      addItem({
        productId: product._id,
        price: product.price,
        quantity: 1,
        image: product.images?.[0],
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

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= 10;
  const isInStock = !isOutOfStock && product.stock > 10;

  // Get enhanced status badge
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

  // Format brand and category (assuming supplier is brand, or use category)
  const brand = product.supplier || 'UNIVERSAL';
  const categoryDisplay = product.category.toUpperCase();

  return (
    <div className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative">
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 to-teal-50/0 group-hover:from-teal-50/30 group-hover:to-transparent transition-all duration-500 pointer-events-none rounded-xl z-0"></div>
      
      <Link
        to={`/products/${product._id}`}
        className="block relative z-0"
      >
      
      {/* Image container with enhanced effects */}
      <div className="relative aspect-w-1 aspect-h-1 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center z-0">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-200 border-t-teal-600"></div>
          </div>
        )}
        <img
          src={displayImage}
          alt={product.name}
          className={`w-full h-56 object-cover group-hover:scale-125 transition-transform duration-700 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          } ${isPlaceholder ? 'opacity-80' : ''}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent group-hover:from-black/30 transition-opacity duration-500"></div>
        
        {/* Placeholder indicator badge */}
        {isPlaceholder && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200">
              Placeholder
            </div>
          </div>
        )}
        
        {/* Enhanced status badge */}
        <div className="absolute top-3 left-3 z-10">
          {getStatusBadge()}
        </div>

        {/* Quick actions on hover */}
        <div className="absolute top-14 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 flex flex-col gap-2">
          {/* Compare button */}
          {canAddToComparison && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToComparison(e);
              }}
              className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors text-gray-600 hover:text-teal-600"
              aria-label="Add to comparison"
              title="Add to comparison"
            >
              <GitCompare className="h-4 w-4" />
            </button>
          )}
          
          {/* Quick view button */}
          {onQuickView && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors"
              aria-label="Quick view"
              title="Quick view"
            >
              <Eye className="h-4 w-4 text-teal-600" />
            </button>
          )}
        </div>
        
        {/* Product Badge */}
        {product.badge && (
          <div className="absolute bottom-3 left-3 z-10">
            {product.badge === 'new' && (
              <div className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border-2 border-white">
                <Zap className="h-3 w-3" />
                <span>NEW</span>
              </div>
            )}
            {product.badge === 'sale' && (
              <div className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border-2 border-white">
                <Tag className="h-3 w-3" />
                <span>SALE</span>
              </div>
            )}
            {product.badge === 'featured' && (
              <div className="flex items-center gap-1 bg-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border-2 border-white">
                <Award className="h-3 w-3" />
                <span>FEATURED</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-5 relative z-10">
        {/* Brand • Category with enhanced styling */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs font-bold text-teal-600 uppercase tracking-wide">
            {brand}
          </div>
          <span className="text-gray-300">•</span>
          <div className="text-xs font-medium text-gray-500">
            {categoryDisplay}
          </div>
        </div>
        
        {/* Product Name with enhanced typography */}
        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors duration-300 leading-tight">
          {product.name}
        </h3>
        
        {/* Product Description */}
        {product.description && (
          <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        
        {/* Price with enhanced styling */}
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
            MWK {product.price.toLocaleString()}
          </span>
          {product.stock > 0 && (
            <span className="text-xs text-gray-500">
              ({product.stock} in stock)
            </span>
          )}
        </div>
        
        {/* Enhanced Add to Cart Button */}
        <Button
          variant="primary"
          size="default"
          className="w-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group/btn"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          <ShoppingCart className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
      
      </Link>
      
      {/* Wishlist button - Always visible and clickable */}
      {isAuthenticated && (
        <button
          onClick={handleWishlistToggle}
          disabled={isAddingToWishlist}
          className={`absolute top-3 right-3 z-50 bg-white rounded-full p-2.5 shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 border-2 ${
            isInWishlist
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600'
          } ${isAddingToWishlist ? 'opacity-70 cursor-wait' : ''}`}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''} ${isAddingToWishlist ? 'animate-pulse' : ''}`} />
        </button>
      )}
      
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-teal-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"></div>
    </div>
  );
};
