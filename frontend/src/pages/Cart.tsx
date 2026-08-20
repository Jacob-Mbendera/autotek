import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { addToSavedForLater, removeFromSaved, applyCoupon, removeCoupon } from '../store/slices/cartSlice';
import { useCart } from '../hooks/useCart';
import { useValidateCouponMutation } from '../store/api/couponApi';
import { useReconcilePendingPaychanguOrder } from '../hooks/useReconcilePendingPaychanguOrder';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Breadcrumb } from '../components/Breadcrumb';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { ProductPlaceholderImage } from '../components/ProductPlaceholderImage';
import { resolveProductDisplayImage } from '../utils/productImage';
import type { ProductImageField } from '../store/api/productApi';
import { JournalCard, JournalButton, JournalInput, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
import {
  ShoppingCart, Plus, Minus, Trash2, ArrowRight, Package, X, AlertCircle,
  Bookmark, BookmarkCheck, Edit2, Check, Calendar, Tag, AlertTriangle,
  CheckCircle, ChevronDown, ChevronUp, Banknote, TrendingUp,
  ShoppingBag, Shield, Percent, BarChart3, Loader2
} from 'lucide-react';

export const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const guestCart = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const {
    items: cartItems,
    totalAmount,
    totalItems,
    removeItem,
    updateQuantity,
    updateItemNote,
    addItem,
  } = useCart();

  // Safety check: ensure savedForLater exists (for persisted state migration)
  const savedForLater = Array.isArray(guestCart.savedForLater) ? guestCart.savedForLater : [];

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
      await updateQuantity(productId, newQuantity);
      setUpdatingQuantityId(null);
    }
  };

  const handleSaveForLater = async (productId: string) => {
    const item = cartItems.find((item) => item.productId === productId);
    if (!item) return;
    dispatch(addToSavedForLater(item));
    await removeItem(productId);
    dispatch(showNotification({
      message: `${item.productName || 'Item'} saved for later`,
      type: 'success'
    }));
    // Auto-expand saved items section so user can see the item moved
    setShowSavedItems(true);
  };

  const handleMoveToCart = async (productId: string) => {
    const item = savedForLater.find((item) => item.productId === productId);
    if (!item) return;
    await addItem(item);
    dispatch(removeFromSaved(productId));
    dispatch(showNotification({
      message: `${item.productName || 'Item'} moved to cart`,
      type: 'success'
    }));
  };

  const handleEditNote = (productId: string, currentNote?: string) => {
    setEditingNoteId(productId);
    setNoteText(currentNote || '');
  };

  const handleSaveNote = async (productId: string) => {
    await updateItemNote(productId, noteText);
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

  const getStockStatus = (item: typeof cartItems[0]) => {
    if (item.stockStatus === 'out-of-stock') return { label: 'Out of stock', className: 'bg-journal-danger-bg text-journal-danger-text', icon: AlertCircle };
    if (item.stockStatus === 'low-stock' || (item.stock && item.stock < item.quantity)) {
      return { label: 'Low stock', className: 'bg-journal-warn-bg text-journal-warn-text', icon: AlertTriangle };
    }
    return { label: 'In stock', className: 'bg-journal-teal-tint text-journal-teal', icon: CheckCircle };
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

  const confirmRemoveItem = async (productId: string) => {
    const item = cartItems.find((item) => item.productId === productId);
    await removeItem(productId);
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
      const productIds = cartItems.map(item => item.productId);
      const result = await validateCoupon({
        code: promoCode.trim(),
        orderTotal: totalAmount,
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
  const finalTotal = Math.max(0, totalAmount - (guestCart.discount || 0));

  const getCartItemImage = (item: typeof cartItems[0]) =>
    resolveProductDisplayImage(
      item.image ? [item.image as ProductImageField] : [],
      undefined,
      600
    );

  // Calculate statistics
  const averageItemPrice = cartItems.length > 0 ? totalAmount / totalItems : 0;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Cart' },
  ];

  // Empty cart state
  if (cartItems.length === 0 && savedForLater.length === 0) {
    return (
      <div className="min-h-screen bg-journal-bone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb items={breadcrumbItems} />
          <JournalCard className="text-center py-16 mt-8">
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-journal-teal-tint rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="h-9 w-9 text-journal-teal" />
              </div>
              <CardHeading className="!text-[24px] mb-2">Your cart is empty</CardHeading>
              <JournalBody className="!text-journal-muted mb-8 max-w-md">
                Looks like you haven't added any items to your cart yet. Start shopping to find great automotive parts and services!
              </JournalBody>
              <Link to="/products">
                <JournalButton variant="primary" size="large">
                  <ShoppingBag className="h-4 w-4" />
                  Browse products
                </JournalButton>
              </Link>
            </div>
          </JournalCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-journal-bone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        {isCheckingPayment && (
          <div
            className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-journal border border-journal-teal-tint-border bg-journal-teal-tint px-4 py-3"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-journal-teal" aria-hidden />
              <JournalBody className="!text-journal-teal">
                Checking your recent PayChangu payment. You can still proceed to checkout.
              </JournalBody>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {pendingOrderId && (
                <Link
                  to={`/orders/${pendingOrderId}`}
                  className="text-[13px] font-sans font-medium text-journal-teal hover:underline"
                >
                  View pending order
                </Link>
              )}
              <button
                type="button"
                onClick={dismissPendingCheckout}
                className="px-3 py-1.5 border border-journal-teal-tint-border text-journal-teal font-sans font-medium text-[11px] tracking-[0.08em] uppercase hover:bg-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="mt-8 mb-8 bg-journal-ink text-journal-bone p-6 sm:p-8 rounded-journal">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-8 w-8 text-journal-bone" />
              </div>
              <div>
                <PageHeading className="!text-[28px] sm:!text-[32px] !text-journal-bone mb-1.5">Shopping cart</PageHeading>
                <p className="text-[14px] font-sans text-journal-bone/80">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} &#183; MWK {totalAmount.toLocaleString()} total
                </p>
              </div>
            </div>
            <Link to="/products">
              <JournalButton
                variant="secondary"
                className="!border-journal-bone/40 !text-journal-bone hover:!bg-journal-bone hover:!text-journal-ink"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Continue shopping
              </JournalButton>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Amount */}
          <JournalCard className="bg-journal-teal-tint border-journal-teal-tint-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Cart total</p>
                <p className="font-journal text-[24px] text-journal-ink">MWK {totalAmount.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp className="h-3.5 w-3.5 text-journal-teal" />
                  <span className="text-[12px] font-sans font-medium text-journal-teal">{totalItems} items</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Banknote className="h-6 w-6 text-journal-teal" />
              </div>
            </div>
          </JournalCard>

          {/* Items Count */}
          <JournalCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Items in cart</p>
                <p className="font-journal text-[24px] text-journal-ink">{totalItems}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Package className="h-3.5 w-3.5 text-journal-body" />
                  <span className="text-[12px] font-sans font-medium text-journal-body">
                    {cartItems.length} unique product{cartItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 bg-journal-sand rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-6 w-6 text-journal-body" />
              </div>
            </div>
          </JournalCard>

          {/* Average Price */}
          <JournalCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Avg. item price</p>
                <p className="font-journal text-[24px] text-journal-ink">MWK {Math.round(averageItemPrice).toLocaleString()}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items - Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const stockStatus = getStockStatus(item);
              const StatusIcon = stockStatus.icon;
              const cartImage = getCartItemImage(item);
              return (
                <JournalCard key={item.productId} className="hover:border-journal-ink transition-colors">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Image */}
                    <Link
                      to={`/products/${item.productId}`}
                      className="flex-shrink-0 w-full sm:w-32 h-32 md:h-36 bg-journal-sand overflow-hidden group relative block"
                    >
                      {cartImage.isPlaceholder ? (
                        <ProductPlaceholderImage
                          productName={item.productName}
                          size="sm"
                          className="w-full h-full"
                        />
                      ) : (
                        <OptimizedImage
                          src={cartImage.url}
                          alt={item.productName}
                          width={150}
                          height={150}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          priority={false}
                        />
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Link
                            to={`/products/${item.productId}`}
                            className="hover:text-journal-teal transition-colors flex-1"
                          >
                            <h3 className="font-journal text-[17px] sm:text-[19px] text-journal-ink mb-1">
                              {item.productName}
                            </h3>
                          </Link>
                          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.04em]', stockStatus.className)}>
                            <StatusIcon className="h-3 w-3" />
                            <span>{stockStatus.label}</span>
                          </div>
                        </div>
                        <p className="text-[13px] font-sans text-journal-muted mb-1">
                          MWK {item.price.toLocaleString()} each
                        </p>
                        <p className="font-journal text-[20px] sm:text-[22px] text-journal-ink">
                          MWK {(item.price * item.quantity).toLocaleString()}
                        </p>
                        {item.stock && item.stock < item.quantity && (
                          <p className="text-[12px] font-sans text-journal-warn-text mt-1 flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Only {item.stock} available in stock
                          </p>
                        )}
                      </div>

                      {/* Item Note */}
                      {editingNoteId === item.productId ? (
                        <div className="flex gap-2">
                          <JournalInput
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note for this item..."
                            className="flex-1 !py-2 text-[13px]"
                          />
                          <button
                            onClick={() => handleSaveNote(item.productId)}
                            className="px-3 bg-journal-ink text-journal-bone hover:bg-journal-ink/90 transition-colors"
                            aria-label="Save note"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelNote}
                            className="px-3 border border-journal-hairline hover:border-journal-ink transition-colors"
                            aria-label="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {item.note ? (
                            <div className="flex-1 flex items-center gap-2 text-[12px] font-sans text-journal-body bg-journal-sand px-2.5 py-1.5 rounded-journal">
                              <span className="truncate">{item.note}</span>
                              <button
                                onClick={() => handleEditNote(item.productId, item.note)}
                                className="flex-shrink-0 text-journal-teal hover:opacity-70"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditNote(item.productId)}
                              className="text-[12px] font-sans text-journal-muted hover:text-journal-teal flex items-center gap-1.5 transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                              Add note
                            </button>
                          )}
                        </div>
                      )}

                      {/* Quantity Controls and Actions */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-journal-input-border rounded-journal overflow-hidden">
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            disabled={updatingQuantityId === item.productId}
                            className="p-2 sm:p-3 hover:bg-journal-sand transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            {updatingQuantityId === item.productId ? (
                              <div className="h-4 w-4 border-2 border-journal-hairline border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Minus className="h-4 w-4 text-journal-body" />
                            )}
                          </button>
                          <span className="px-3 sm:px-4 py-2 text-journal-ink font-sans font-bold min-w-[3rem] text-center text-[14px]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            disabled={updatingQuantityId === item.productId}
                            className="p-2 sm:p-3 hover:bg-journal-sand transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Increase quantity"
                          >
                            {updatingQuantityId === item.productId ? (
                              <div className="h-4 w-4 border-2 border-journal-hairline border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 text-journal-body" />
                            )}
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveForLater(item.productId)}
                            className="p-2 text-journal-teal hover:bg-journal-teal-tint transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center border border-journal-teal-tint-border rounded-journal"
                            aria-label="Save for later"
                            title="Save for later"
                          >
                            <Bookmark className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-2 text-journal-danger-text hover:bg-journal-danger-bg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center border border-journal-error-border rounded-journal"
                            aria-label="Remove item"
                            title="Remove from cart"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </JournalCard>
              );
            })}

            {/* Saved for Later Section */}
            {savedForLater.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowSavedItems(!showSavedItems)}
                  className="flex items-center justify-between w-full p-4 bg-white rounded-journal hover:bg-journal-sand transition-colors border border-journal-hairline"
                >
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="h-4 w-4 text-journal-teal" />
                    <span className="font-sans font-semibold text-[14px] text-journal-ink">
                      Saved for later ({savedForLater.length})
                    </span>
                  </div>
                  {showSavedItems ? (
                    <ChevronUp className="h-4 w-4 text-journal-body" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-journal-body" />
                  )}
                </button>
                {showSavedItems && (
                  <div className="mt-3 space-y-3">
                    {savedForLater.map((item) => {
                      const cartImage = getCartItemImage(item);
                      return (
                      <JournalCard key={item.productId} className="bg-journal-sand">
                        <div className="flex gap-4">
                          <Link
                            to={`/products/${item.productId}`}
                            className="flex-shrink-0 w-20 h-20 bg-journal-hairline overflow-hidden relative block"
                          >
                            {cartImage.isPlaceholder ? (
                              <ProductPlaceholderImage
                                productName={item.productName}
                                size="sm"
                                className="w-full h-full"
                              />
                            ) : (
                              <OptimizedImage
                                src={cartImage.url}
                                alt={item.productName}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                priority={false}
                              />
                            )}
                          </Link>
                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1">
                              <Link
                                to={`/products/${item.productId}`}
                                className="hover:text-journal-teal transition-colors"
                              >
                                <p className="font-sans font-medium text-[14px] text-journal-ink">{item.productName}</p>
                              </Link>
                              <p className="text-[13px] font-sans text-journal-muted">
                                MWK {item.price.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <JournalButton
                                variant="primary"
                                onClick={() => handleMoveToCart(item.productId)}
                              >
                                Move to cart
                              </JournalButton>
                              <button
                                onClick={() => handleRemoveFromSaved(item.productId)}
                                className="p-2 text-journal-danger-text hover:bg-journal-danger-bg transition-colors border border-journal-error-border rounded-journal"
                                aria-label="Remove from saved"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </JournalCard>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Summary - Right Column (1/3 width) - Sticky */}
          <div className="lg:col-span-1">
            <JournalCard className="lg:sticky lg:top-24">
              <CardHeading className="!text-[19px] mb-6">Order summary</CardHeading>

              {/* Promo Code Section */}
              <div className="mb-6">
                {guestCart.appliedCoupon ? (
                  <div className="p-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-journal-teal" />
                        <span className="text-[13px] font-sans font-medium text-journal-teal">
                          {guestCart.appliedCoupon.code}
                        </span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-journal-teal hover:opacity-70"
                        aria-label="Remove coupon"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[12px] font-sans text-journal-teal">
                      Discount: MWK {guestCart.discount.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <JournalInput
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
                      disabled={validatingCoupon}
                    />
                    <JournalButton
                      variant="secondary"
                      onClick={handleApplyCoupon}
                      disabled={!promoCode.trim() || validatingCoupon}
                      className="w-full"
                    >
                      {validatingCoupon ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-journal-hairline border-t-transparent rounded-full animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Tag className="h-3.5 w-3.5" />
                          Apply coupon
                        </>
                      )}
                    </JournalButton>
                  </div>
                )}
              </div>

              {/* Estimated Delivery */}
              <div className="mb-6 p-4 bg-journal-teal-tint rounded-journal border border-journal-teal-tint-border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-journal-teal" />
                  <p className="text-[13px] font-sans text-journal-teal">
                    Estimated delivery: <span className="font-semibold">{calculateEstimatedDelivery()}</span>
                  </p>
                </div>
              </div>

              {/* Summary Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-journal-body">
                  <span className="text-[13px] font-sans">
                    Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                  </span>
                  <span className="text-[13px] font-sans font-semibold">MWK {totalAmount.toLocaleString()}</span>
                </div>
                {guestCart.discount > 0 && (
                  <div className="flex justify-between text-journal-teal">
                    <span className="text-[13px] font-sans flex items-center gap-1.5">
                      <Percent className="h-3 w-3" />
                      Discount {guestCart.appliedCoupon?.code && `(${guestCart.appliedCoupon.code})`}
                    </span>
                    <span className="text-[13px] font-sans font-semibold">-MWK {guestCart.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-journal-body">
                  <span className="text-[13px] font-sans">Shipping</span>
                  <span className="text-[13px] font-sans font-semibold text-journal-teal">Free</span>
                </div>
                <div className="border-t border-journal-hairline pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-sans font-semibold text-[15px] text-journal-ink">Total</span>
                    <span className="font-journal text-[24px] text-journal-ink">
                      MWK {finalTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proceed to Checkout Button */}
              <JournalButton
                variant="primary"
                className="w-full mb-4"
                onClick={handleProceedToCheckout}
              >
                Proceed to checkout
                <ArrowRight className="h-4 w-4" />
              </JournalButton>

              {!isAuthenticated && (
                <p className="text-[12px] font-sans text-journal-faint text-center mb-4 flex items-center justify-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  You'll need to sign in to complete your purchase
                </p>
              )}

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-[12px] font-sans text-journal-faint pt-4 border-t border-journal-hairline">
                <Shield className="h-3.5 w-3.5 text-journal-teal" />
                <span>Secure checkout</span>
              </div>
            </JournalCard>
          </div>
        </div>

        {/* Remove Confirmation Modal */}
        {removingItemId && (
          <div className="fixed inset-0 bg-journal-ink/50 flex items-center justify-center z-50 p-4">
            <JournalCard className="w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 bg-journal-danger-bg rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-journal-danger-text" />
                </div>
                <CardHeading className="!text-[19px]">Remove item?</CardHeading>
              </div>
              <JournalBody className="!text-journal-muted mb-6">
                Are you sure you want to remove this item from your cart? This action cannot be undone.
              </JournalBody>
              <div className="flex gap-3 justify-end">
                <JournalButton variant="secondary" onClick={cancelRemoveItem}>
                  Cancel
                </JournalButton>
                <JournalButton
                  variant="primary"
                  onClick={() => confirmRemoveItem(removingItemId)}
                  className="!bg-journal-danger-text hover:!bg-journal-danger-text/90"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove item
                </JournalButton>
              </div>
            </JournalCard>
          </div>
        )}
      </div>
    </div>
  );
};
