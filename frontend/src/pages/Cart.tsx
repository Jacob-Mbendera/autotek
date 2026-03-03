import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { removeItem, updateQuantity, clearCart, saveForLater, moveToCart, updateItemNote, removeFromSaved } from '../store/slices/cartSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { H1, Body } from '../components/ui/Typography';
import { 
  ShoppingCart, Plus, Minus, Trash2, ArrowRight, Package, X, AlertCircle, 
  Bookmark, BookmarkCheck, Edit2, Check, Calendar, Tag, AlertTriangle, 
  CheckCircle, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';

export const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [showSavedItems, setShowSavedItems] = useState<boolean>(false);
  const [updatingQuantityId, setUpdatingQuantityId] = useState<string | null>(null);

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
    dispatch(saveForLater(productId));
  };

  const handleMoveToCart = (productId: string) => {
    dispatch(moveToCart(productId));
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
    dispatch(removeItem(productId));
    setRemovingItemId(null);
  };

  const cancelRemoveItem = () => {
    setRemovingItemId(null);
  };

  const handleProceedToCheckout = () => {
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/login?returnUrl=/checkout');
    }
  };

  // Empty cart state
  if (cart.items.length === 0 && cart.savedForLater.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center animate-fadeIn">
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <H1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</H1>
            <Body className="text-gray-600 mb-8 max-w-md">
              Looks like you haven't added any items to your cart yet. Start shopping to find great automotive parts and services!
            </Body>
            <Link to="/products">
              <Button variant="primary" size="large" className="animate-pulse">
                <Package className="h-5 w-5 mr-2" />
                Browse Products
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <H1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Shopping Cart</H1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Cart Items - Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {cart.items.map((item, index) => {
            const stockStatus = getStockStatus(item);
            const StatusIcon = stockStatus.icon;
            return (
              <Card 
                key={item.productId} 
                variant="md" 
                className="animate-fadeIn transition-all duration-300 hover:shadow-lg"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Product Image */}
                  <Link
                    to={`/products/${item.productId}`}
                    className="flex-shrink-0 w-full sm:w-32 h-32 md:h-36 bg-gray-100 rounded-lg overflow-hidden group relative"
                  >
                    {item.image ? (
                      <>
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
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
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{stockStatus.label}</span>
                        </div>
                      </div>
                      <Body className="text-sm sm:text-base text-gray-600 mb-1">
                        MWK {item.price.toLocaleString()} each
                      </Body>
                      <Body className="text-base sm:text-lg font-bold text-teal-600">
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
                      {/* Quantity Controls - Enhanced for mobile */}
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
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
                        <span className="px-3 sm:px-4 py-2 text-gray-900 font-medium min-w-[3rem] text-center text-sm sm:text-base">
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
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                          aria-label="Save for later"
                          title="Save for later"
                        >
                          <Bookmark className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          {cart.savedForLater.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowSavedItems(!showSavedItems)}
                className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="h-5 w-5 text-teal-600" />
                  <Body className="font-medium text-gray-900">
                    Saved for Later ({cart.savedForLater.length})
                  </Body>
                </div>
                {showSavedItems ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>
              {showSavedItems && (
                <div className="mt-3 space-y-3 animate-fadeIn">
                  {cart.savedForLater.map((item) => (
                    <Card key={item.productId} variant="md" className="bg-gray-50">
                      <div className="flex gap-4">
                        <Link
                          to={`/products/${item.productId}`}
                          className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
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
                              onClick={() => dispatch(removeFromSaved(item.productId))}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

        {/* Cart Summary - Right Column (1/3 width) - Sticky on mobile bottom, sidebar on desktop */}
        <div className="lg:col-span-1">
          <Card variant="md" className="lg:sticky lg:top-24">
            <H1 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Order Summary</H1>

            {/* Promo Code Section */}
            <div className="mb-4 sm:mb-6">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => {
                    // Promo code logic would go here
                    setPromoCode('');
                  }}
                  disabled={!promoCode.trim()}
                  className="px-4"
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Estimated Delivery */}
            <div className="mb-4 sm:mb-6 p-3 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex items-center gap-2 text-sm text-teal-700">
                <Calendar className="h-4 w-4" />
                <Body className="text-sm">
                  Estimated delivery: <span className="font-semibold">{calculateEstimatedDelivery()}</span>
                </Body>
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-3 mb-4 sm:mb-6">
              <div className="flex justify-between text-gray-600">
                <Body className="text-sm sm:text-base">
                  Subtotal ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})
                </Body>
                <Body className="font-medium text-sm sm:text-base">MWK {cart.totalAmount.toLocaleString()}</Body>
              </div>
              <div className="flex justify-between text-gray-600">
                <Body className="text-sm sm:text-base">Shipping</Body>
                <Body className="font-medium text-sm sm:text-base">MWK 0</Body>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <Body className="text-base sm:text-lg font-bold text-gray-900">Total</Body>
                  <Body className="text-base sm:text-lg font-bold text-teal-600">
                    MWK {cart.totalAmount.toLocaleString()}
                  </Body>
                </div>
              </div>
            </div>

            {/* Proceed to Checkout Button */}
            <Button
              variant="primary"
              size="default"
              className="w-full flex items-center justify-center mb-3 sm:mb-4"
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {!isAuthenticated && (
              <Body className="text-xs text-gray-500 text-center mb-3 sm:mb-4">
                You'll need to sign in to complete your purchase
              </Body>
            )}

            {/* Continue Shopping Link */}
            <Link to="/products" className="block">
              <Button variant="ghost" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Remove Confirmation Modal */}
      {removingItemId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card variant="md" className="w-full max-w-md">
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
  );
};
