import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { removeItem, updateQuantity, saveForLater, moveToCart, updateItemNote, removeFromSaved, applyCoupon, removeCoupon } from '../store/slices/cartSlice';
import { useValidateCouponMutation } from '../store/api/couponApi';
import { useReconcilePendingPaychanguOrder } from '../hooks/useReconcilePendingPaychanguOrder';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import type { ProductImageField } from '../store/api/productApi';
import {
  ShoppingCart, Plus, Minus, Trash2, ArrowRight, Package, X, AlertCircle,
  Bookmark, BookmarkCheck, Edit2, Check, Calendar, Tag, AlertTriangle,
  CheckCircle, ChevronDown, ChevronUp, Banknote, TrendingUp,
  ShoppingBag, Shield, Percent, BarChart3, Loader2
} from 'lucide-react';

export const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  // Safety check: ensure savedForLater exists (for persisted state migration)
  const savedForLater = Array.isArray(cart.savedForLater) ? cart.savedForLater : [];
  
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [showSavedItems, setShowSavedItems] = useState<boolean>(false);
  const [updatingQuantityId, setUpdatingQuantityId] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  
  const [validateCoupon] = useValidateCouponMutation();
  const { isCheckingPayment, pendingOrderId, dismissPendingCheckout } =
    useReconcilePendingPaychanguOrder({ mode: 'cart' });

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setRemovingItemId(productId);
    } else {
      setUpdatingQuantityId(productId);
      // Simulate slight delay for animation
      setTimeout(() => {
        dispatch(updateQuantity({ productId, quantity: newQuantity }));
        setUpdatingQuantityId(null);
      }, 150);
    }
  };

  const handleSaveForLater = (productId: string) => {
    const item = cart.items.find((item) => item.productId === productId);
    dispatch(saveForLater(productId));
    dispatch(showNotification({ 
      message: item ? `${item.productName || 'Item'} saved for later` : 'Item saved for later', 
      type: 'success' 
    }));
    // Auto-expand saved items section so user can see the item moved
    setShowSavedItems(true);
  };

  const handleMoveToCart = (productId: string) => {
    const item = savedForLater.find((item) => item.productId === productId);
    dispatch(moveToCart(productId));
    dispatch(showNotification({ 
      message: item ? `${item.productName || 'Item'} moved to cart` : 'Item moved to cart', 
      type: 'success' 
    }));
  };

  const handleEditNote = (productId: string, currentNote?: string) => {
    setEditingNoteId(productId);
    setNoteText(currentNote || '');
  };

  const handleSaveNote = (productId: string) => {
    dispatch(updateItemNote({ productId, note: noteText }));
    setEditingNoteId(null);
    setNoteText('');
  };

  const handleCancelNote = () => {
    setEditingNoteId(null);
    setNoteText('');
  };

  const handleRemoveFromSaved = (productId: string) => {
    const item = savedForLater.find((item) => item.productId === productId);
    dispatch(removeFromSaved(productId));
    dispatch(showNotification({ 
      message: item ? `${item.productName || 'Item'} removed from saved` : 'Item removed from saved', 
      type: 'success' 
    }));
  };

  const getStockStatus = (item: typeof cart.items[0]) => {
    if (item.stockStatus === 'out-of-stock') return { label: 'Out of Stock', color: 'text-red-600 bg-red-50', icon: AlertCircle };
    if (item.stockStatus === 'low-stock' || (item.stock && item.stock < item.quantity)) {
      return { label: 'Low Stock', color: 'text-amber-600 bg-amber-50', icon: AlertTriangle };
    }
    return { label: 'In Stock', color: 'text-green-600 bg-green-50', icon: CheckCircle };
  };

  const calculateEstimatedDelivery = () => {
    const days = 3; // Default 3 business days
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleRemoveItem = (productId: string) => {
    setRemovingItemId(productId);
  };

  const confirmRemoveItem = (productId: string) => {
    const item = cart.items.find((item) => item.productId === productId);
    dispatch(removeItem(productId));
    setRemovingItemId(null);
    dispatch(showNotification({ 
      message: item ? `${item.productName || 'Item'} removed from cart` : 'Item removed from cart', 
      type: 'success' 
    }));
  };

  const cancelRemoveItem = () => {
    setRemovingItemId(null);
  };

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) return;

    setValidatingCoupon(true);
    try {
      const productIds = cart.items.map(item => item.productId);
      const result = await validateCoupon({
        code: promoCode.trim(),
        orderTotal: cart.totalAmount,
        productIds,
      }).unwrap();

      if (result.valid) {
        dispatch(applyCoupon({
          code: result.coupon.code,
          discount: result.discount,
          type: result.coupon.type,
          value: result.coupon.value,
        }));
        dispatch(showNotification({
          message: result.message || 'Coupon applied successfully!',
          type: 'success',
        }));
        setPromoCode('');
      }
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Invalid coupon code');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    dispatch(showNotification({
      message: 'Coupon removed',
      type: 'info',
    }));
  };

  const handleProceedToCheckout = () => {
    navigate('/checkout');
  };

  // Calculate final total with discount
  const finalTotal = Math.max(0, cart.totalAmount - (cart.discount || 0));

  // Get display image for a cart item
  const getDisplayImage = (item: typeof cart.items[0]) => {
    return resolveProductDisplayImage(
      item.image ? [item.image as ProductImageField] : [],
      undefined,
      600
    ).url;
  };

  // Calculate statistics
  const averageItemPrice = cart.items.length > 0 ? cart.totalAmount / cart.totalItems : 0;
  const itemsWithLowStock = cart.items.filter(item => item.stockStatus === 'low-stock' || (item.stock && item.stock < item.quantity)).length;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Cart' },
  ];

  // Empty cart state
  if (cart.items.length === 0 && savedForLater.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb items={breadcrumbItems} />
          <Card variant="md" className="text-center py-16 mt-8">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 bg-teal-100 rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="h-12 w-12 text-teal-600" />
              </div>
              <H1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</H1>
              <Body className="text-gray-600 mb-8 max-w-md">
                Looks like you haven't added any items to your cart yet. Start shopping to find great automotive parts and services!
              </Body>
              <Link to="/products">
                <Button variant="primary" size="large">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        {isCheckingPayment && (
          <div
            className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-teal-900"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal-600" aria-hidden />
              <Body className="text-sm text-teal-800">
                Checking your recent PayChangu payment. You can still proceed to checkout.
              </Body>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {pendingOrderId && (
                <Link
                  to={`/orders/${pendingOrderId}`}
                  className="text-sm font-medium text-teal-700 hover:text-teal-900 underline"
                >
                  View pending order
                </Link>
              )}
              <Button type="button" variant="secondary" size="small" onClick={dismissPendingCheckout}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="mt-8 mb-8">
          <Card variant="lg" className="bg-teal-600 text-white border-0 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center">
                  <ShoppingCart className="h-10 w-10 text-white" />
                </div>
                <div>
                  <H1 className="text-3xl font-bold mb-2 text-white">Shopping Cart</H1>
                  <Body className="text-white/90">
                    {cart.totalItems} item{cart.totalItems !== 1 ? 's' : ''} • MWK {cart.totalAmount.toLocaleString()} total
                  </Body>
                </div>
              </div>
              <Link to="/products">
                <Button variant="secondary" size="default" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Amount */}
          <Card variant="md" className="bg-teal-50 border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <Body className="text-gray-600 text-sm mb-1">Cart Total</Body>
                <H2 className="text-2xl font-bold text-gray-900">MWK {cart.totalAmount.toLocaleString()}</H2>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  <Body className="text-sm text-teal-600 font-medium">{cart.totalItems} items</Body>
                </div>
              </div>
              <div className="h-16 w-16 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Banknote className="h-8 w-8 text-teal-600" />
              </div>
            </div>
          </Card>

          {/* Items Count */}
          <Card variant="md" className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <Body className="text-gray-600 text-sm mb-1">Items in Cart</Body>
                <H2 className="text-2xl font-bold text-gray-900">{cart.totalItems}</H2>
                <div className="flex items-center gap-1 mt-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <Body className="text-sm text-blue-600 font-medium">
                    {cart.items.length} unique product{cart.items.length !== 1 ? 's' : ''}
                  </Body>
                </div>
              </div>
              <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Average Price */}
          <Card variant="md" className="bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <Body className="text-gray-600 text-sm mb-1">Avg. Item Price</Body>
                <H2 className="text-2xl font-bold text-gray-900">MWK {Math.round(averageItemPrice).toLocaleString()}</H2>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items - Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item, index) => {
              const stockStatus = getStockStatus(item);
              const StatusIcon = stockStatus.icon;
              return (
                <Card 
                  key={item.productId} 
                  variant="md" 
                  className="transition-all duration-300 hover:shadow-md border-2 border-gray-200 hover:border-teal-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Image */}
                    <Link
                      to={`/products/${item.productId}`}
                      className="flex-shrink-0 w-full sm:w-32 h-32 md:h-36 bg-gray-100 rounded-lg overflow-hidden group relative block"
                    >
                      <OptimizedImage
                        src={getDisplayImage(item)}
                        alt={item.productName}
                        width={150}
                        height={150}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        priority={false}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity pointer-events-none" />
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Link
                            to={`/products/${item.productId}`}
                            className="hover:text-teal-600 transition-colors flex-1"
                          >
                            <H1 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                              {item.productName}
                            </H1>
                          </Link>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            <span>{stockStatus.label}</span>
                          </div>
                        </div>
                        <Body className="text-sm sm:text-base text-gray-600 mb-1">
                          MWK {item.price.toLocaleString()} each
                        </Body>
                        <Body className="text-lg sm:text-xl font-bold text-teal-600">
                          MWK {(item.price * item.quantity).toLocaleString()}
                        </Body>
                        {item.stock && item.stock < item.quantity && (
                          <Body className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Only {item.stock} available in stock
                          </Body>
                        )}
                      </div>

                      {/* Item Note */}
                      {editingNoteId === item.productId ? (
                        <div className="flex gap-2">
                          <Input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note for this item..."
                            className="flex-1 text-sm"
                          />
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleSaveNote(item.productId)}
                            className="px-3"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={handleCancelNote}
                            className="px-3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {item.note ? (
                            <div className="flex-1 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              <span className="truncate">{item.note}</span>
                              <button
                                onClick={() => handleEditNote(item.productId, item.note)}
                                className="flex-shrink-0 text-teal-600 hover:text-teal-700"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditNote(item.productId)}
                              className="text-xs text-gray-500 hover:text-teal-600 flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                              Add note
                            </button>
                          )}
                        </div>
                      )}

                      {/* Quantity Controls and Actions */}
                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        {/* Quantity Controls */}
                        <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            disabled={updatingQuantityId === item.productId}
                            className="p-2 sm:p-3 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            {updatingQuantityId === item.productId ? (
                              <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Minus className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                            )}
                          </button>
                          <span className="px-3 sm:px-4 py-2 text-gray-900 font-bold min-w-[3rem] text-center text-sm sm:text-base">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            disabled={updatingQuantityId === item.productId}
                            className="p-2 sm:p-3 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Increase quantity"
                          >
                            {updatingQuantityId === item.productId ? (
                              <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                            )}
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveForLater(item.productId)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center border border-teal-200"
                            aria-label="Save for later"
                            title="Save for later"
                          >
                            <Bookmark className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center border border-red-200"
                            aria-label="Remove item"
                            title="Remove from cart"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Saved for Later Section */}
            {savedForLater.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowSavedItems(!showSavedItems)}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-2 border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="h-5 w-5 text-teal-600" />
                    <Body className="font-semibold text-gray-900">
                      Saved for Later ({savedForLater.length})
                    </Body>
                  </div>
                  {showSavedItems ? (
                    <ChevronUp className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                {showSavedItems && (
                  <div className="mt-3 space-y-3">
                    {savedForLater.map((item) => (
                      <Card key={item.productId} variant="md" className="bg-gray-50 border-2 border-gray-200">
                        <div className="flex gap-4">
                          <Link
                            to={`/products/${item.productId}`}
                            className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden relative block"
                          >
                            <OptimizedImage
                              src={getDisplayImage(item)}
                              alt={item.productName}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                              priority={false}
                            />
                          </Link>
                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1">
                              <Link
                                to={`/products/${item.productId}`}
                                className="hover:text-teal-600 transition-colors"
                              >
                                <Body className="font-medium text-gray-900">{item.productName}</Body>
                              </Link>
                              <Body className="text-sm text-gray-600">
                                MWK {item.price.toLocaleString()}
                              </Body>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="primary"
                                size="small"
                                onClick={() => handleMoveToCart(item.productId)}
                              >
                                Move to Cart
                              </Button>
                              <button
                                onClick={() => handleRemoveFromSaved(item.productId)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                aria-label="Remove from saved"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Summary - Right Column (1/3 width) - Sticky */}
          <div className="lg:col-span-1">
            <Card variant="md" className="lg:sticky lg:top-24 border-2 border-gray-200 shadow-sm">
              <H1 className="text-xl font-bold text-gray-900 mb-6">Order Summary</H1>

              {/* Promo Code Section */}
              <div className="mb-6">
                {cart.appliedCoupon ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Body className="text-sm font-medium text-green-800">
                          {cart.appliedCoupon.code}
                        </Body>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-green-800"
                        aria-label="Remove coupon"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Body className="text-xs text-green-700">
                      Discount: MWK {cart.discount.toLocaleString()}
                    </Body>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        className="text-sm"
                        disabled={validatingCoupon}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="default"
                      onClick={handleApplyCoupon}
                      disabled={!promoCode.trim() || validatingCoupon}
                      className="px-4"
                    >
                      {validatingCoupon ? (
                        <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Tag className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Estimated Delivery */}
              <div className="mb-6 p-4 bg-teal-50 rounded-lg border-2 border-teal-200">
                <div className="flex items-center gap-2 text-sm text-teal-700">
                  <Calendar className="h-5 w-5" />
                  <Body className="text-sm font-medium">
                    Estimated delivery: <span className="font-bold">{calculateEstimatedDelivery()}</span>
                  </Body>
                </div>
              </div>

              {/* Summary Details */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <Body className="text-sm sm:text-base">
                    Subtotal ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})
                  </Body>
                  <Body className="font-semibold text-sm sm:text-base">MWK {cart.totalAmount.toLocaleString()}</Body>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <Body className="text-sm sm:text-base flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Discount {cart.appliedCoupon?.code && `(${cart.appliedCoupon.code})`}
                    </Body>
                    <Body className="font-semibold text-sm sm:text-base">-MWK {cart.discount.toLocaleString()}</Body>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <Body className="text-sm sm:text-base">Shipping</Body>
                  <Body className="font-semibold text-sm sm:text-base text-green-600">Free</Body>
                </div>
                <div className="border-t-2 border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <Body className="text-lg font-bold text-gray-900">Total</Body>
                    <Body className="text-xl font-bold text-teal-600">
                      MWK {finalTotal.toLocaleString()}
                    </Body>
                  </div>
                </div>
              </div>

              {/* Proceed to Checkout Button */}
              <Button
                variant="primary"
                size="default"
                className="w-full flex items-center justify-center mb-4"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              {!isAuthenticated && (
                <Body className="text-xs text-gray-500 text-center mb-4 flex items-center justify-center gap-1">
                  <Shield className="h-3 w-3" />
                  You'll need to sign in to complete your purchase
                </Body>
              )}

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4 border-t border-gray-200">
                <Shield className="h-4 w-4 text-teal-600" />
                <Body>Secure checkout</Body>
              </div>
            </Card>
          </div>
        </div>

        {/* Remove Confirmation Modal */}
        {removingItemId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card variant="md" className="w-full max-w-md shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <H1 className="text-xl font-bold text-gray-900">Remove Item?</H1>
              </div>
              <Body className="text-gray-600 mb-6">
                Are you sure you want to remove this item from your cart? This action cannot be undone.
              </Body>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={cancelRemoveItem}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => confirmRemoveItem(removingItemId)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Item
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
