import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../store/types';
import { useCart } from '../hooks/useCart';
import { useGetWishlistQuery, useRemoveFromWishlistMutation, useClearWishlistMutation } from '../store/api/wishlistApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getProductImageUrl } from '../utils/productImage';
import { ProductCard } from '../components/ProductCard';
import { Breadcrumb } from '../components/Breadcrumb';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { JournalCard, JournalButton, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { Heart, Trash2, ShoppingBag, Package, ShoppingCart, Loader2,
  TrendingUp, Banknote, BarChart3, AlertCircle } from 'lucide-react';

export const Wishlist = () => {
  const dispatch = useAppDispatch();
  const { addItem } = useCart();
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
      await addItem({
        productId: product._id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        image: getProductImageUrl(product.images?.[0]),
      });
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
          await addItem({
            productId: product._id,
            productName: product.name,
            price: product.price,
            quantity: 1,
            image: getProductImageUrl(product.images?.[0]),
          });
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
    <div className="min-h-screen bg-journal-bone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        {/* Hero Section */}
        <div className="mt-8 mb-8 bg-white border border-journal-hairline p-6 sm:p-8 rounded-journal">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-journal-danger-bg border border-journal-error-border flex items-center justify-center flex-shrink-0">
                <Heart className="h-8 w-8 text-journal-danger-text fill-journal-danger-text" />
              </div>
              <div>
                <PageHeading className="!text-[28px] sm:!text-[32px] mb-1.5">My wishlist</PageHeading>
                <p className="text-[14px] font-sans text-journal-muted">
                  {products.length} item{products.length !== 1 ? 's' : ''} saved &#183; MWK {totalValue.toLocaleString()} total value
                </p>
              </div>
            </div>
            {products.length > 0 && (
              <div className="flex flex-wrap gap-3">
                <JournalButton
                  variant="primary"
                  onClick={handleMoveAllToCart}
                  disabled={movingAllToCart}
                >
                  {movingAllToCart ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add all to cart
                    </>
                  )}
                </JournalButton>
                <JournalButton
                  variant="secondary"
                  onClick={() => setShowClearModal(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </JournalButton>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Value */}
            <JournalCard className="bg-journal-danger-bg border-journal-error-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-journal-muted mb-1">Total value</p>
                  <p className="font-journal text-[22px] text-journal-ink">MWK {totalValue.toLocaleString()}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-journal-danger-text" />
                    <span className="text-[12px] font-sans font-medium text-journal-danger-text">{products.length} items</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Banknote className="h-6 w-6 text-journal-danger-text" />
                </div>
              </div>
            </JournalCard>

            {/* Items Count */}
            <JournalCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-journal-muted mb-1">Saved items</p>
                  <p className="font-journal text-[22px] text-journal-ink">{products.length}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Heart className="h-3.5 w-3.5 text-journal-danger-text fill-journal-danger-text" />
                    <span className="text-[12px] font-sans font-medium text-journal-body">In wishlist</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-journal-sand rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="h-6 w-6 text-journal-body" />
                </div>
              </div>
            </JournalCard>

            {/* In Stock */}
            <JournalCard className="bg-journal-teal-tint border-journal-teal-tint-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-journal-muted mb-1">In stock</p>
                  <p className="font-journal text-[22px] text-journal-ink">{inStockCount}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Package className="h-3.5 w-3.5 text-journal-teal" />
                    <span className="text-[12px] font-sans font-medium text-journal-teal">Available now</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-journal-teal" />
                </div>
              </div>
            </JournalCard>

            {/* Average Price */}
            <JournalCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-journal-muted mb-1">Avg. price</p>
                  <p className="font-journal text-[22px] text-journal-ink">MWK {Math.round(averagePrice).toLocaleString()}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <BarChart3 className="h-3.5 w-3.5 text-journal-body" />
                    <span className="text-[12px] font-sans font-medium text-journal-body">Per item</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-journal-sand rounded-full flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-journal-body" />
                </div>
              </div>
            </JournalCard>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-journal-hairline border-t-journal-teal mb-4"></div>
            <JournalBody className="!text-journal-muted">Loading wishlist...</JournalBody>
          </div>
        ) : error ? (
          <JournalCard className="text-center py-16">
            <div className="h-20 w-20 bg-journal-danger-bg rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-journal-danger-text" />
            </div>
            <JournalBody className="!text-journal-danger-text !text-[16px] font-semibold mb-2">Error loading wishlist</JournalBody>
            <JournalBody className="!text-journal-danger-text">Please try again later</JournalBody>
          </JournalCard>
        ) : products.length === 0 ? (
          <JournalCard className="text-center py-16">
            <div className="h-20 w-20 bg-journal-sand rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-journal-faint" />
            </div>
            <CardHeading className="!text-[24px] mb-2">Your wishlist is empty</CardHeading>
            <JournalBody className="!text-journal-muted mb-6 max-w-md mx-auto">
              Start adding products you love to your wishlist. Save items for later and never miss out on your favorites!
            </JournalBody>
            <Link to="/products">
              <JournalButton variant="primary" className="mx-auto">
                <ShoppingBag className="h-3.5 w-3.5" />
                Browse products
              </JournalButton>
            </Link>
          </JournalCard>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map((product) => (
                <div key={product._id} className="relative group">
                  <ProductCard product={product} onAddToCart={handleAddToCart} />
                  <div className="absolute top-14 right-3 z-20 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={addingToCart === product._id || product.status === 'out-of-stock' || product.stock === 0}
                      className="bg-white rounded-full p-2 shadow border border-journal-hairline hover:border-journal-ink text-journal-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Move to cart"
                      title="Move to cart"
                    >
                      {addingToCart === product._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(product._id);
                      }}
                      className="bg-white rounded-full p-2 shadow border border-journal-hairline hover:border-journal-ink text-journal-danger-text transition-colors"
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Out of Stock Notice */}
            {outOfStockCount > 0 && (
              <JournalCard className="bg-journal-warn-bg border-journal-warn-bg mb-8">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-journal-warn-text flex-shrink-0" />
                  <JournalBody className="!text-journal-warn-text">
                    <strong>{outOfStockCount}</strong> item{outOfStockCount !== 1 ? 's' : ''} in your wishlist {outOfStockCount === 1 ? 'is' : 'are'} currently out of stock.
                  </JournalBody>
                </div>
              </JournalCard>
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
