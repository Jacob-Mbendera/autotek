import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { useCreateOrderMutation } from '../store/api/orderApi';
import { clearCart } from '../store/slices/cartSlice';
import type { PaymentMethod } from '../../../shared/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { H1, Body } from '../components/ui/Typography';
import { ShoppingCart, MapPin, CreditCard, CheckCircle } from 'lucide-react';

export const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);
  
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  
  const [shippingAddress, setShippingAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [error, setError] = useState('');

  // Payment method constants
  const PAYMENT_METHODS = {
    AIRTEL_MONEY: 'airtel-money' as PaymentMethod,
    BANK_TRANSFER: 'bank-transfer' as PaymentMethod,
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!shippingAddress.trim()) {
      setError('Please enter a shipping address');
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (cart.items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    try {
      const orderItems = cart.items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const result = await createOrder({
        items: orderItems,
        shippingAddress: shippingAddress.trim(),
        paymentMethod: paymentMethod as PaymentMethod,
      }).unwrap();

      // Clear cart after successful order
      dispatch(clearCart());

      // Redirect to order confirmation
      navigate(`/orders/${result.order._id}`);
    } catch (err: any) {
      setError(err.data?.message || 'Failed to place order. Please try again.');
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <H1 className="text-2xl mb-2">Your cart is empty</H1>
          <Body className="text-gray-600 mb-6">
            Add some products to your cart before checkout.
          </Body>
          <Button variant="primary" onClick={() => navigate('/products')}>
            Browse Products
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <H1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</H1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <Card variant="md">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-teal-600" />
              <H1 className="text-xl">Shipping Address</H1>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                required
                placeholder="Enter your full shipping address"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
              />
            </div>
          </Card>

          {/* Payment Method */}
          <Card variant="md">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-teal-600" />
              <H1 className="text-xl">Payment Method</H1>
            </div>
            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={PAYMENT_METHODS.AIRTEL_MONEY}
                  checked={paymentMethod === PAYMENT_METHODS.AIRTEL_MONEY}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Airtel Money</div>
                  <div className="text-sm text-gray-600">Pay with Airtel Money</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={PAYMENT_METHODS.BANK_TRANSFER}
                  checked={paymentMethod === PAYMENT_METHODS.BANK_TRANSFER}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Bank Transfer</div>
                  <div className="text-sm text-gray-600">Bank Transfer (Manual verification)</div>
                </div>
              </label>
            </div>
          </Card>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <Card variant="md" className="sticky top-24">
            <H1 className="text-xl font-bold mb-4">Order Summary</H1>

            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt="Product"
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      Product ID: {item.productId.slice(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-600">
                      Qty: {item.quantity} × MWK {item.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>MWK {cart.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>MWK 0</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>MWK {cart.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="default"
              className="w-full mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                'Placing Order...'
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
};
