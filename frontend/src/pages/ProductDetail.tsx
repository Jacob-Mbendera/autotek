import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProductQuery } from '../store/api/productApi';
import { useAppDispatch, useAppSelector } from '../store/types';
import { addItem, clearCart } from '../store/slices/cartSlice';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { H1, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShoppingCart, Zap, CheckCircle, Package, Heart } from 'lucide-react';
import { ReviewList } from '../components/ReviewList';
import { ReviewForm } from '../components/ReviewForm';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { getProductImageBlur, getProductImageUrl } from '../utils/productImage';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetProductQuery(id!);
  
  // Wishlist functionality
  const { data: wishlistData } = useGetWishlistQuery(undefined, { skip: !isAuthenticated });
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  
  const isInWishlist = wishlistData?.wishlist?.products?.some((p) => p._id === id) || false;

  // Reset image error when product changes
  useEffect(() => {
    setImageError(false);
    setSelectedImageIndex(0);
  }, [id, data?.product?._id]);

  // Get placeholder image based on category
  const getPlaceholderImage = (category?: string) => {
    const cat = category?.toLowerCase() || '';
    const placeholders: Record<string, string> = {
      'engine parts': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'brake parts': 'https://images.unsplash.com/photo-1486262715619-67b35e0b08d3?w=600&q=80',
      'braking system': 'https://images.unsplash.com/photo-1593642532400-26709d8ae933?w=600&q=80',
      'electrical': 'https://images.unsplash.com/photo-1581092336000-3e3b3b3b3b3b?w=600&q=80',
      'suspension': 'https://images.unsplash.com/photo-1581092336000-3e3b3b3b3b3b?w=600&q=80',
      'filters': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'transmission': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80',
      'cooling system': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'exhaust system': 'https://images.unsplash.com/photo-1593642532400-26709d8ae933?w=600&q=80',
      'body parts': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80',
    };
    return placeholders[cat] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80';
  };

  const handleAddToCart = () => {
    if (data?.product) {
      dispatch(
        addItem({
          productId: data.product._id,
          productName: data.product.name,
          price: data.product.price,
          quantity: 1,
          image: getProductImageUrl(data.product.images?.[0]),
        })
      );
      dispatch(showNotification({ message: 'Product added to cart!', type: 'success' }));
    }
  };

  const handleBuyNow = () => {
    if (data?.product) {
      // Clear cart and add only this product
      dispatch(clearCart());
      dispatch(
        addItem({
          productId: data.product._id,
          productName: data.product.name,
          price: data.product.price,
          quantity: 1,
          image: getProductImageUrl(data.product.images?.[0]),
        })
      );
      // Navigate to checkout
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
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to update wishlist');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Body className="text-gray-600">Loading product...</Body>
        </div>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Body className="text-red-600">Product not found.</Body>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate('/products')}
          >
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const product = data.product;
  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= 10;
  const isInStock = !isOutOfStock && product.stock > 10;

  // Determine display images
  const firstImageUrl = getProductImageUrl(product.images?.[0]);
  const hasValidImage = Boolean(firstImageUrl.trim());
  const placeholderImage = getPlaceholderImage(product.category);

  let displayEntries: { url: string; blurDataUrl?: string }[];
  if (hasValidImage && product.images && product.images.length > 0 && !imageError) {
    displayEntries = product.images.map((img) => ({
      url: getProductImageUrl(img),
      blurDataUrl: getProductImageBlur(img),
    }));
  } else {
    displayEntries = [{ url: placeholderImage }];
  }

  const isPlaceholder = !hasValidImage || !product.images || product.images.length === 0 || imageError;

  const safeImageIndex = Math.min(selectedImageIndex, displayEntries.length - 1);
  const currentEntry =
    displayEntries[safeImageIndex] || displayEntries[0] || { url: placeholderImage };

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

  // Get stock badge
  const getStockBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600">
          OUT OF STOCK
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-600">
          LOW STOCK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-600">
        IN STOCK
      </span>
    );
  };

  // Get benefits based on category or default
  const getBenefits = () => {
    const categoryBenefits: Record<string, string[]> = {
      'Brake Parts': [
        'Low-dust formula keeps wheels clean longer',
        'Dual-layer shim design for quiet operation',
        '12-month or 20,000km local warranty',
        'Engineered for Malawian road conditions',
      ],
      'Engine Parts': [
        'Premium quality materials for durability',
        'Compatible with local vehicle models',
        'Extended warranty coverage',
        'Designed for optimal performance',
      ],
      'Electrical': [
        'Reliable performance in all conditions',
        'Easy installation process',
        'Long-lasting components',
        'Compatible with standard systems',
      ],
      'Suspension': [
        'Enhanced ride comfort',
        'Durable construction',
        'Easy to install',
        'Warranty included',
      ],
    };

    return (
      categoryBenefits[product.category] || [
        'Premium quality materials',
        'Designed for durability',
        'Local warranty included',
        'Compatible with standard systems',
      ]
    );
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
    { label: product.name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Main Product Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
            {currentEntry.url ? (
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
              <div className="w-full h-[500px] flex items-center justify-center bg-gray-200">
                <Package className="h-16 w-16 text-gray-400" />
              </div>
            )}
            {/* Placeholder indicator */}
            {isPlaceholder && (
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200">
                  Placeholder
                </div>
              </div>
            )}
            {/* Image carousel indicator */}
            {displayEntries.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {displayEntries.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      selectedImageIndex === index
                        ? 'bg-teal-500 w-8'
                        : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                    }`}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
          {displayEntries.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {displayEntries.slice(0, 4).map((entry, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity border-2 ${
                    selectedImageIndex === index
                      ? 'border-teal-500'
                      : 'border-transparent'
                  }`}
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
            <H1 className="text-4xl font-bold text-gray-900 mb-4">{product.name}</H1>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl font-bold text-teal-600">
                MWK {product.price.toLocaleString()}
              </span>
              {getStockBadge()}
            </div>
          </div>

          {/* Description */}
          <div>
            <Body className="text-gray-600 text-base leading-relaxed whitespace-pre-line">
              {product.description}
            </Body>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="gray"
              size="default"
              className="flex-1 flex items-center justify-center"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
            <Button
              variant="primary"
              size="default"
              className="flex-1 flex items-center justify-center"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              <Zap className="h-5 w-5 mr-2" />
              Buy Now
            </Button>
            <Button
              variant={isInWishlist ? "primary" : "secondary"}
              size="default"
              className="flex items-center justify-center"
              onClick={handleWishlistToggle}
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <Card variant="md" className="mb-8">
        <H1 className="text-2xl font-bold text-gray-900 mb-6">Technical Specifications</H1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="font-semibold text-gray-900">Brand</span>
            <span className="text-gray-600">{product.supplier || 'Universal'}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="font-semibold text-gray-900">SKU</span>
            <span className="text-gray-600">{sku}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="font-semibold text-gray-900">Material</span>
            <span className="text-gray-600">
              {product.description.toLowerCase().includes('ceramic')
                ? 'Premium Ceramic'
                : product.description.toLowerCase().includes('organic')
                ? 'Organic'
                : product.description.toLowerCase().includes('semi-metallic')
                ? 'Semi-Metallic'
                : 'Premium Quality'}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="font-semibold text-gray-900">Compatibility</span>
            <span className="text-gray-600">{product.category}</span>
          </div>
        </div>
      </Card>

      {/* Why Choose This Part? */}
      <Card variant="md" className="mb-8">
        <H1 className="text-2xl font-bold text-gray-900 mb-6">Why Choose This Part?</H1>
        <div className="space-y-4">
          {getBenefits().map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
              <Body className="text-gray-700">{benefit}</Body>
            </div>
          ))}
        </div>
      </Card>

      {/* Reviews Section */}
      <div className="mb-8">
        <H1 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</H1>
        <div className="space-y-8">
          <ReviewForm productId={id!} />
          <ReviewList productId={id!} />
        </div>
      </div>
    </div>
  );
};
