import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { removeItem, updateQuantity, clearCart } from '../store/slices/cartSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Package, X, AlertCircle } from 'lucide-react';

export const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setRemovingItemId(productId);
    } else {
      dispatch(updateQuantity({ productId, quantity: newQuantity }));
    }
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
  if (cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center">
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <H1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</H1>
            <Body className="text-gray-600 mb-8 max-w-md">
              Looks like you haven't added any items to your cart yet. Start shopping to find great automotive parts and services!
            </Body>
            <Link to="/products">
              <Button variant="primary" size="large">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <H1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</H1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items - Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.productId} variant="md">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Product Image */}
                <Link
                  to={`/products/${item.productId}`}
                  className="flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </Link>

                {/* Product Info */}
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <Link
                      to={`/products/${item.productId}`}
                      className="hover:text-teal-600 transition-colors"
                    >
                      <H1 className="text-lg font-semibold text-gray-900 mb-2">
                        {item.productName}
                      </H1>
                    </Link>
                    <Body className="text-gray-600 mb-2">
                      MWK {item.price.toLocaleString()} each
                    </Body>
                    <Body className="text-lg font-bold text-teal-600">
                      MWK {(item.price * item.quantity).toLocaleString()}
                    </Body>
                  </div>

                  {/* Quantity Controls and Remove */}
                  <div className="flex items-center gap-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        className="p-2 hover:bg-gray-100 transition-colors rounded-l-lg"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="px-4 py-2 text-gray-900 font-medium min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        className="p-2 hover:bg-gray-100 transition-colors rounded-r-lg"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove item"
                      title="Remove from cart"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Cart Summary - Right Column (1/3 width) */}
        <div className="lg:col-span-1">
          <Card variant="md" className="sticky top-24">
            <H1 className="text-xl font-bold text-gray-900 mb-6">Order Summary</H1>

            {/* Summary Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <Body>Subtotal ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})</Body>
                <Body className="font-medium">MWK {cart.totalAmount.toLocaleString()}</Body>
              </div>
              <div className="flex justify-between text-gray-600">
                <Body>Shipping</Body>
                <Body className="font-medium">MWK 0</Body>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <Body className="text-lg font-bold text-gray-900">Total</Body>
                  <Body className="text-lg font-bold text-teal-600">
                    MWK {cart.totalAmount.toLocaleString()}
                  </Body>
                </div>
              </div>
            </div>

            {/* Proceed to Checkout Button */}
            <Button
              variant="primary"
              size="default"
              className="w-full flex items-center justify-center"
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {!isAuthenticated && (
              <Body className="text-xs text-gray-500 text-center mt-3">
                You'll need to sign in to complete your purchase
              </Body>
            )}

            {/* Continue Shopping Link */}
            <Link to="/products" className="block mt-4">
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
