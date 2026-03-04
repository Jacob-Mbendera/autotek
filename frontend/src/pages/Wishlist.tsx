import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetWishlistQuery, useRemoveFromWishlistMutation, useClearWishlistMutation } from '../store/api/wishlistApi';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui/Button';
import { H1, H2, Body } from '../components/ui/Typography';
import { Heart, Trash2, ShoppingBag, Package } from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const Wishlist = () => {
  useEffect(() => {
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, []);

  const { data, isLoading, error } = useGetWishlistQuery();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [clearWishlist] = useClearWishlistMutation();

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId).unwrap();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear your wishlist?')) {
      try {
        await clearWishlist().unwrap();
      } catch (error) {
        console.error('Error clearing wishlist:', error);
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <Heart className="h-6 w-6 text-red-600 fill-red-600" />
            </div>
            <div>
              <H1 className="text-3xl font-bold text-gray-900">My Wishlist</H1>
              <Body className="text-gray-600">
                {data?.wishlist?.products?.length || 0} items saved
              </Body>
            </div>
          </div>
          
          {data?.wishlist?.products && data.wishlist.products.length > 0 && (
            <Button
              variant="secondary"
              onClick={handleClear}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-600 mb-4"></div>
            <Body className="text-gray-600 text-lg">Loading wishlist...</Body>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-50 rounded-lg border-2 border-red-200">
            <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <Body className="text-red-600 text-lg font-semibold mb-2">Error loading wishlist</Body>
            <Body className="text-red-500">Please try again later</Body>
          </div>
        ) : !data?.wishlist?.products || data.wishlist.products.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-gray-200">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <H2 className="text-gray-700 text-xl font-semibold mb-2">Your wishlist is empty</H2>
            <Body className="text-gray-600 mb-6">
              Start adding products you love to your wishlist
            </Body>
            <Link to="/products">
              <Button variant="primary" className="flex items-center gap-2 mx-auto">
                <ShoppingBag className="h-4 w-4" />
                Browse Products
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {data.wishlist.products.map((product) => (
                <div key={product._id} className="relative group">
                  <ProductCard product={product} />
                  <button
                    onClick={() => handleRemove(product._id)}
                    className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};
