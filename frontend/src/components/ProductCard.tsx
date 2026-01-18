import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAppDispatch } from '../store/types';
import { addItem } from '../store/slices/cartSlice';
import type { Product } from '../store/api/productApi';
import { Button } from './ui/Button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const dispatch = useAppDispatch();

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
  };

  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= 10;
  const isInStock = !isOutOfStock && product.stock > 10;

  // Get status badge
  const getStatusBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
          OUT OF STOCK
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="absolute top-2 left-2 px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
          LOW STOCK
        </span>
      );
    }
    return (
      <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
        IN STOCK
      </span>
    );
  };

  // Format brand and category (assuming supplier is brand, or use category)
  const brand = product.supplier || 'UNIVERSAL';
  const categoryDisplay = product.category.toUpperCase();

  return (
    <Link
      to={`/products/${product._id}`}
      className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="relative aspect-w-1 aspect-h-1 bg-gray-100 overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No image</span>
          </div>
        )}
        {getStatusBadge()}
      </div>
      
      <div className="p-4">
        {/* Brand • Category */}
        <div className="text-xs font-medium text-gray-500 mb-1">
          {brand} • {categoryDisplay}
        </div>
        
        {/* Product Name */}
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors">
          {product.name}
        </h3>
        
        {/* Product Description */}
        {product.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        
        {/* Price */}
        <div className="mb-3">
          <span className="text-lg font-bold text-teal-600">
            MWK {product.price.toLocaleString()}
          </span>
        </div>
        
        {/* Add to Cart Button */}
        <Button
          variant="primary"
          size="default"
          className="w-full"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </Link>
  );
};
