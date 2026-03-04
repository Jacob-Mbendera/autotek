import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingCart, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppDispatch } from '../store/types';
import { addItem } from '../store/slices/cartSlice';
import type { Product } from '../store/api/productApi';
import { Button } from './ui/Button';
import { H2, H4, Body } from './ui/Typography';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickViewModal = ({ product, isOpen, onClose }: QuickViewModalProps) => {
  const dispatch = useAppDispatch();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setCurrentImageIndex(0);
      setImageError(false);
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
  const currentImage = images[currentImageIndex] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80';

  const handleAddToCart = () => {
    dispatch(
      addItem({
        productId: product._id,
        price: product.price,
        quantity: 1,
        image: product.images?.[0],
      })
    );
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= 10;
  const brand = product.supplier || 'UNIVERSAL';
  const categoryDisplay = product.category.toUpperCase();

  const getStatusBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
          OUT OF STOCK
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
          LOW STOCK
        </span>
      );
    }
    return (
      <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
        IN STOCK
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="relative bg-gray-100 rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none overflow-hidden">
            <div className="relative aspect-square">
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              
              {/* Image Navigation */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-900" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-900" />
                  </button>
                  
                  {/* Image Indicators */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'w-8 bg-white'
                            : 'w-2 bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-10">
                {getStatusBadge()}
              </div>
            </div>
            
            {/* Thumbnail Gallery */}
            {hasMultipleImages && images.length > 1 && (
              <div className="p-4 bg-white border-t border-gray-200 flex gap-2 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-teal-600 ring-2 ring-teal-200'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} view ${index + 1}`}
                      className="w-full h-full object-cover"
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
              className="ml-auto mb-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            {/* Brand & Category */}
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-bold text-teal-600 uppercase tracking-wide">
                {brand}
              </div>
              <span className="text-gray-300">•</span>
              <div className="text-xs font-medium text-gray-500">
                {categoryDisplay}
              </div>
            </div>

            {/* Product Name */}
            <H2 className="text-2xl font-bold text-gray-900 mb-4">
              {product.name}
            </H2>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
                  MWK {product.price.toLocaleString()}
                </span>
                {product.stock > 0 && (
                  <span className="text-sm text-gray-500">
                    ({product.stock} in stock)
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <H4 className="text-sm font-semibold text-gray-900 mb-2">Description</H4>
                <Body className="text-gray-700 leading-relaxed">{product.description}</Body>
              </div>
            )}

            {/* Product Details */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Category:</span>
                <span className="font-medium text-gray-900">{product.category}</span>
              </div>
              {product.supplier && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Supplier:</span>
                  <span className="font-medium text-gray-900">{product.supplier}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3">
              <Button
                variant="primary"
                size="large"
                className="w-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              
              <Link to={`/products/${product._id}`} onClick={onClose}>
                <Button
                  variant="secondary"
                  size="large"
                  className="w-full"
                >
                  View Full Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
