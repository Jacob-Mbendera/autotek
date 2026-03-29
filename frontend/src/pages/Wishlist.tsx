import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../store/types';
import { addItem } from '../store/slices/cartSlice';
import { useGetWishlistQuery, useRemoveFromWishlistMutation, useClearWishlistMutation } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui/Button';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import { Card } from '../components/ui/Card';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Heart, Trash2, ShoppingBag, Package, ShoppingCart, Loader2, 
  TrendingUp, Banknote, BarChart3, Sparkles, Gift, Star, Award, AlertCircle } from 'lucide-react';

export const Wishlist = () => {
  const dispatch = useAppDispatch();
  const [showClearModal, setShowClearModal] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [movingAllToCart, setMovingAllToCart] = useState(false);

  useEffect(() => {
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, []);

  const { data, isLoading, error } = useGetWishlistQuery();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [clearWishlist, { isLoading: isClearing }] = useClearWishlistMutation();

  const wishlist = data?.wishlist;
  const products = wishlist?.products || [];

  // Calculate statistics
  const totalValue = products.reduce((sum: number, product: any) => sum + (product.price || 0), 0);
  const averagePrice = products.length > 0 ? totalValue / products.length : 0;
  const inStockCount = products.filter((p: any) => p.status !== 'out-of-stock' && (p.stock || 0) > 0).length;
  const outOfStockCount = products.length - inStockCount;

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId).unwrap();
      dispatch(showNotification({ message: 'Product removed from wishlist', type: 'success' }));
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to remove product from wishlist');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleClear = async () => {
    try {
      await clearWishlist().unwrap();
      setShowClearModal(false);
      dispatch(showNotification({ message: 'Wishlist cleared successfully', type: 'success' }));
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to clear wishlist');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleAddToCart = async (product: any) => {
    setAddingToCart(product._id);
    try {
      dispatch(
        addItem({
          productId: product._id,
          price: product.price,
          quantity: 1,
          image: product.images?.[0],
        })
      );
      await removeFromWishlist(product._id).unwrap();
      dispatch(showNotification({ message: 'Product moved to cart!', type: 'success' }));
    } catch (error) {
      dispatch(showNotification({
        message: 'Failed to move product to cart',
        type: 'error',
      }));
    } finally {
      setAddingToCart(null);
    }
  };

  const handleMoveAllToCart = async () => {
    if (!products || products.length === 0) return;

    setMovingAllToCart(true);
    try {
      let movedCount = 0;
      for (const product of products) {
        if (product.status !== 'out-of-stock' && (product.stock || 0) > 0) {
          dispatch(
            addItem({
              productId: product._id,
              price: product.price,
              quantity: 1,
              image: product.images?.[0],
            })
          );
          await removeFromWishlist(product._id).unwrap();
          movedCount++;
        }
      }
      dispatch(showNotification({
        message: `${movedCount} product${movedCount > 1 ? 's' : ''} moved to cart!`,
        type: 'success',
      }));
    } catch (error) {
      dispatch(showNotification({
        message: 'Failed to move some products to cart',
        type: 'error',
      }));
    } finally {
      setMovingAllToCart(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Wishlist' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        {/* Hero Section */}
        <div className="mt-8 mb-8">
          <Card variant="lg" className="bg-gradient-to-br from-red-600 via-pink-500 to-rose-600 text-white border-0 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center shadow-xl">
                  <Heart className="h-10 w-10 text-white fill-white" />
                </div>
                <div>
                  <H1 className="text-3xl font-bold mb-2 text-white">My Wishlist</H1>
                  <Body className="text-white/90">
                    {products.length} item{products.length !== 1 ? 's' : ''} saved • MWK {totalValue.toLocaleString()} total value
                  </Body>
                </div>
              </div>
              {products.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    size="default"
                    onClick={handleMoveAllToCart}
                    disabled={movingAllToCart}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    {movingAllToCart ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add All to Cart
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowClearModal(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Statistics Cards */}
        {products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Value */}
            <Card variant="md" className="bg-gradient-to-br from-red-50 to-pink-100 border-red-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <Body className="text-gray-600 text-sm mb-1">Total Value</Body>
                  <H2 className="text-2xl font-bold text-gray-900">MWK {totalValue.toLocaleString()}</H2>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <Body className="text-sm text-red-600 font-medium">{products.length} items</Body>
                  </div>
                </div>
                <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Banknote className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </Card>

            {/* Items Count */}
            <Card variant="md" className="bg-gradient-to-br from-pink-50 to-rose-100 border-pink-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <Body className="text-gray-600 text-sm mb-1">Saved Items</Body>
                  <H2 className="text-2xl font-bold text-gray-900">{products.length}</H2>
                  <div className="flex items-center gap-1 mt-2">
                    <Heart className="h-4 w-4 text-pink-600 fill-pink-600" />
                    <Body className="text-sm text-pink-600 font-medium">In wishlist</Body>
                  </div>
                </div>
                <div className="h-16 w-16 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <Heart className="h-8 w-8 text-pink-600 fill-pink-600" />
                </div>
              </div>
            </Card>

            {/* In Stock */}
            <Card variant="md" className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <Body className="text-gray-600 text-sm mb-1">In Stock</Body>
                  <H2 className="text-2xl font-bold text-gray-900">{inStockCount}</H2>
                  <div className="flex items-center gap-1 mt-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <Body className="text-sm text-green-600 font-medium">Available now</Body>
                  </div>
                </div>
                <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </Card>

            {/* Average Price */}
            <Card variant="md" className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <Body className="text-gray-600 text-sm mb-1">Avg. Price</Body>
                  <H2 className="text-2xl font-bold text-gray-900">MWK {Math.round(averagePrice).toLocaleString()}</H2>
                  <div className="flex items-center gap-1 mt-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <Body className="text-sm text-purple-600 font-medium">Per item</Body>
                  </div>
                </div>
                <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600 mb-4"></div>
            <Body className="text-gray-600 text-lg">Loading wishlist...</Body>
          </div>
        ) : error ? (
          <Card variant="md" className="text-center py-16 shadow-lg">
            <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-red-500" />
            </div>
            <Body className="text-red-600 text-lg font-semibold mb-2">Error loading wishlist</Body>
            <Body className="text-red-500">Please try again later</Body>
          </Card>
        ) : products.length === 0 ? (
          <Card variant="md" className="text-center py-16 shadow-lg">
            <div className="h-24 w-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-gray-400" />
            </div>
            <H2 className="text-gray-700 text-2xl font-bold mb-2">Your wishlist is empty</H2>
            <Body className="text-gray-600 mb-6 max-w-md mx-auto">
              Start adding products you love to your wishlist. Save items for later and never miss out on your favorites!
            </Body>
            <Link to="/products">
              <Button variant="primary" className="flex items-center gap-2 mx-auto">
                <ShoppingBag className="h-4 w-4" />
                Browse Products
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map((product) => (
                <div key={product._id} className="relative group">
                  <ProductCard product={product} onAddToCart={handleAddToCart} />
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={addingToCart === product._id || product.status === 'out-of-stock' || product.stock === 0}
                      className="bg-white/95 backdrop-blur-sm rounded-full p-2.5 shadow-xl hover:bg-teal-50 hover:text-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-200"
                      aria-label="Move to cart"
                      title="Move to cart"
                    >
                      {addingToCart === product._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(product._id);
                      }}
                      className="bg-white/95 backdrop-blur-sm rounded-full p-2.5 shadow-xl hover:bg-red-50 hover:text-red-600 transition-all border-2 border-gray-200"
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Out of Stock Notice */}
            {outOfStockCount > 0 && (
              <Card variant="md" className="bg-amber-50 border-2 border-amber-200 mb-8">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <Body className="text-amber-800">
                    <strong>{outOfStockCount}</strong> item{outOfStockCount !== 1 ? 's' : ''} in your wishlist {outOfStockCount === 1 ? 'is' : 'are'} currently out of stock.
                  </Body>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Clear Confirmation Modal */}
        <ConfirmationModal
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          onConfirm={handleClear}
          title="Clear Wishlist"
          message="Are you sure you want to clear your wishlist? This action cannot be undone."
          confirmText="Clear All"
          cancelText="Cancel"
          variant="warning"
          isLoading={isClearing}
        />
      </div>
    </div>
  );
};
