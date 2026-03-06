import { useState, useEffect, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { useCreateOrderMutation } from '../store/api/orderApi';
import { useInitiatePaymentMutation } from '../store/api/paymentApi';
import { clearCart } from '../store/slices/cartSlice';
import type { PaymentMethod } from '../../../shared/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { H1, Body } from '../components/ui/Typography';
import { ShoppingCart, MapPin, CreditCard, CheckCircle, User, Mail, Phone, Percent, ChevronRight } from 'lucide-react';

export const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
  const [initiatePayment, { isLoading: isInitiatingPayment }] = useInitiatePaymentMutation();
  
  // Guest information (only if not authenticated)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const isLoading = isCreatingOrder || isInitiatingPayment;
  
  // Calculate final total with discount
  const finalTotal = Math.max(0, cart.totalAmount - (cart.discount || 0));

  // Checkout steps
  const CHECKOUT_STEPS = [
    { id: 1, name: 'Shipping Info', icon: MapPin },
    { id: 2, name: 'Payment', icon: CreditCard },
    { id: 3, name: 'Review', icon: CheckCircle },
  ];

  // Update step based on form completion
  const updateStep = () => {
    if (shippingAddress.trim() && !paymentMethod) {
      setCurrentStep(1);
    } else if (shippingAddress.trim() && paymentMethod) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  };

  // Update step when form changes
  React.useEffect(() => {
    updateStep();
  }, [shippingAddress, paymentMethod]);

  // Payment method constants
  const PAYMENT_METHODS = {
    AIRTEL_MONEY: 'airtel-money' as PaymentMethod,
    BANK_TRANSFER: 'bank-transfer' as PaymentMethod,
    PAYCHANGU: 'paychangu' as PaymentMethod,
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate guest information if not authenticated
    if (!isAuthenticated) {
      if (!guestName.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!guestEmail.trim()) {
        setError('Please enter your email');
        return;
      }
      if (!guestPhone.trim()) {
        setError('Please enter your phone number');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail.trim())) {
        setError('Please enter a valid email address');
        return;
      }
    }

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
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      // Prepare order data
      const orderData: any = {
        items: orderItems,
        shippingAddress: shippingAddress.trim(),
        paymentMethod: paymentMethod as PaymentMethod,
      };

      // Add coupon code if applied
      if (cart.appliedCoupon) {
        orderData.couponCode = cart.appliedCoupon.code;
      }

      // Add guest info if not authenticated
      if (!isAuthenticated) {
        orderData.guestInfo = {
          name: guestName.trim(),
          email: guestEmail.trim().toLowerCase(),
          phone: guestPhone.trim(),
        };
      }

      // Create order first
      const orderResult = await createOrder(orderData).unwrap();

      // If PayChangu, initiate payment and redirect to PayChangu checkout
      if (paymentMethod === PAYMENT_METHODS.PAYCHANGU) {
        const returnUrl = `${window.location.origin}/payment/success?orderId=${orderResult.order._id}${!isAuthenticated ? `&email=${encodeURIComponent(guestEmail.trim())}` : ''}`;
        const cancelUrl = `${window.location.origin}/payment/cancel?orderId=${orderResult.order._id}${!isAuthenticated ? `&email=${encodeURIComponent(guestEmail.trim())}` : ''}`;
        
        const paymentResult = await initiatePayment({
          orderId: orderResult.order._id,
          paymentMethod: paymentMethod as PaymentMethod,
          phoneNumber: isAuthenticated ? user?.phone : guestPhone.trim(),
          returnUrl,
          cancelUrl,
        }).unwrap();

        // If we get a redirect URL, redirect to PayChangu
        if (paymentResult.redirectUrl) {
          window.location.href = paymentResult.redirectUrl;
          return; // Don't clear cart yet, wait for payment confirmation
        }
      }

      // For other payment methods, clear cart and redirect to order confirmation
      dispatch(clearCart());
      
      // Store guest email in sessionStorage for order lookup if guest
      if (!isAuthenticated) {
        sessionStorage.setItem('guestOrderEmail', guestEmail.trim());
      }
      
      navigate(`/orders/${orderResult.order._id}${!isAuthenticated ? `?email=${encodeURIComponent(guestEmail.trim())}` : ''}`);
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

      {!isAuthenticated && (
        <Card variant="md" className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <H1 className="text-lg font-semibold text-gray-900 mb-2">Guest Checkout</H1>
              <Body className="text-sm text-gray-600 mb-4">
                You're checking out as a guest. You can create an account after placing your order for faster checkout next time.
              </Body>
              <div className="space-y-3">
                <Input
                  label="Full Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  icon={User}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  icon={Mail}
                />
                <Input
                  label="Phone Number"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                  placeholder="+265XXXXXXXXX or 0XXXXXXXXX"
                  icon={Phone}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Progress Indicator */}
      <Card variant="md" className="mb-8">
        <div className="flex items-center justify-between">
          {CHECKOUT_STEPS.map((step, index) => {
            const isActive = currentStep >= step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;
            
            return (
              <Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={`rounded-full p-3 transition-all ${
                    isActive ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className={`ml-3 text-sm font-medium ${
                    isActive ? 'text-teal-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {index < CHECKOUT_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 transition-all ${
                    isCompleted ? 'bg-teal-500' : 'bg-gray-200'
                  }`} />
                )}
              </Fragment>
            );
          })}
        </div>
      </Card>

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

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={PAYMENT_METHODS.PAYCHANGU}
                  checked={paymentMethod === PAYMENT_METHODS.PAYCHANGU}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">PayChangu</div>
                  <div className="text-sm text-gray-600">Pay with card, mobile money, or bank transfer</div>
                </div>
              </label>
            </div>
          </Card>

          {/* Optional Account Creation (for guests) */}
          {!isAuthenticated && (
            <Card variant="md" className="bg-gray-50 border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <Body className="text-sm font-medium text-gray-900 mb-1">
                    Create an account for faster checkout next time
                  </Body>
                  <Body className="text-xs text-gray-600">
                    We'll send you a password setup link to {guestEmail || 'your email'} after your order is placed.
                  </Body>
                </div>
              </label>
            </Card>
          )}

          {/* Login Prompt for Guests */}
          {!isAuthenticated && (
            <Card variant="md" className="bg-teal-50 border-teal-200">
              <Body className="text-sm text-gray-700">
                Already have an account?{' '}
                <Link to={`/login?returnUrl=/checkout`} className="text-teal-600 hover:text-teal-700 font-medium underline">
                  Sign in
                </Link>
                {' '}for faster checkout and order tracking.
              </Body>
            </Card>
          )}

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
              {cart.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Discount {cart.appliedCoupon?.code && `(${cart.appliedCoupon.code})`}
                  </span>
                  <span>-MWK {cart.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>MWK 0</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>MWK {finalTotal.toLocaleString()}</span>
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
