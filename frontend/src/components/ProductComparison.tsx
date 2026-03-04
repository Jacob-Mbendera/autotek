import { X, ShoppingCart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { removeFromComparison, clearComparison } from '../store/slices/comparisonSlice';
import { addItem } from '../store/slices/cartSlice';
import { Button } from './ui/Button';
import { H3, Body } from './ui/Typography';
import { Link } from 'react-router-dom';
import type { Product } from '../store/api/productApi';

export const ProductComparison = () => {
  const dispatch = useAppDispatch();
  const { products, maxProducts } = useAppSelector((state) => state.comparison);

  if (products.length === 0) return null;

  const handleRemove = (productId: string) => {
    dispatch(removeFromComparison(productId));
  };

  const handleClear = () => {
    dispatch(clearComparison());
  };

  const handleAddToCart = (product: Product) => {
    dispatch(
      addItem({
        productId: product._id,
        price: product.price,
        quantity: 1,
        image: product.images?.[0],
      })
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 animate-slide-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <H3 className="text-lg font-bold text-gray-900">Compare Products</H3>
            <span className="text-sm text-gray-600">
              ({products.length}/{maxProducts})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/compare">
              <Button variant="primary" size="small">
                Compare
              </Button>
            </Link>
            <Button variant="ghost" size="small" onClick={handleClear}>
              Clear All
            </Button>
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2">
          {products.map((product) => (
            <div
              key={product._id}
              className="flex-shrink-0 w-48 bg-gray-50 rounded-lg border border-gray-200 p-3 relative"
            >
              <button
                onClick={() => handleRemove(product._id)}
                className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Remove from comparison"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
              
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
              ) : (
                <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
                  <span className="text-xs text-gray-400">No image</span>
                </div>
              )}
              
              <Body className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                {product.name}
              </Body>
              <Body className="text-sm font-bold text-teal-600 mb-2">
                MWK {product.price.toLocaleString()}
              </Body>
              
              <Button
                variant="primary"
                size="small"
                className="w-full"
                onClick={() => handleAddToCart(product)}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Add to Cart
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
