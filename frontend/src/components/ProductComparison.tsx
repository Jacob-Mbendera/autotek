import { X, ShoppingCart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { removeFromComparison, clearComparison } from '../store/slices/comparisonSlice';
import { useCart } from '../hooks/useCart';
import { Link } from 'react-router-dom';
import type { Product } from '../store/api/productApi';
import { OptimizedImage } from './ui/OptimizedImage';
import { getProductImageBlur, getProductImageUrl } from '../utils/productImage';
import { CardHeading } from './journal';

export const ProductComparison = () => {
  const dispatch = useAppDispatch();
  const { addItem } = useCart();
  const { products, maxProducts } = useAppSelector((state) => state.comparison);

  if (products.length === 0) return null;

  const handleRemove = (productId: string) => {
    dispatch(removeFromComparison(productId));
  };

  const handleClear = () => {
    dispatch(clearComparison());
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: getProductImageUrl(product.images?.[0]),
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-journal-ink z-50 animate-slide-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CardHeading className="!text-[18px]">Compare products</CardHeading>
            <span className="text-[13px] font-sans text-journal-muted">
              ({products.length}/{maxProducts})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/compare"
              className="inline-flex items-center justify-center px-4 py-2 bg-journal-ink text-journal-bone font-sans font-medium text-[11px] tracking-[0.1em] uppercase hover:bg-journal-ink/90 transition-colors"
            >
              Compare
            </Link>
            <button
              onClick={handleClear}
              className="inline-flex items-center justify-center px-4 py-2 text-journal-body font-sans font-medium text-[11px] tracking-[0.1em] uppercase hover:text-journal-teal transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {products.map((product) => (
            <div
              key={product._id}
              className="flex-shrink-0 w-48 bg-journal-sand rounded-journal border border-journal-hairline p-3 relative"
            >
              <button
                onClick={() => handleRemove(product._id)}
                className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded-full transition-colors"
                aria-label="Remove from comparison"
              >
                <X className="h-3.5 w-3.5 text-journal-body" />
              </button>

              {getProductImageUrl(product.images?.[0]) ? (
                <div className="mb-2">
                  <OptimizedImage
                    src={getProductImageUrl(product.images?.[0])}
                    blurDataUrl={getProductImageBlur(product.images?.[0])}
                    alt={product.name}
                    width={192}
                    height={128}
                    className="w-full h-32 object-cover rounded-journal"
                    priority={false}
                  />
                </div>
              ) : (
                <div className="w-full h-32 bg-journal-hairline rounded-journal mb-2 flex items-center justify-center">
                  <span className="text-[11px] font-sans text-journal-faint">No image</span>
                </div>
              )}

              <p className="text-[13px] font-sans font-semibold text-journal-ink line-clamp-2 mb-1">
                {product.name}
              </p>
              <p className="text-[13px] font-sans font-bold text-journal-teal mb-2">
                MWK {product.price.toLocaleString()}
              </p>

              <button
                onClick={() => handleAddToCart(product)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-journal-ink text-journal-bone font-sans font-medium text-[11px] tracking-[0.08em] uppercase hover:bg-journal-ink/90 transition-colors"
              >
                <ShoppingCart className="h-3 w-3" />
                Add to cart
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
