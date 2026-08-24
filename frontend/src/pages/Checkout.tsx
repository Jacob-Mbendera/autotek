import React, { useEffect, useState, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { useCreateOrderMutation, useCreateBankTransferOrderMutation, useGetOrdersQuery } from '../store/api/orderApi';
import type { ShippingAddress } from '../store/api/orderApi';
import { useInitiatePaymentMutation } from '../store/api/paymentApi';
import { useResendVerificationEmailMutation } from '../store/api/authApi';
import { useGetBankTransferDetailsQuery } from '../store/api/configApi';
import { removeCoupon } from '../store/slices/cartSlice';
import { useCart } from '../hooks/useCart';
import { setUser } from '../store/slices/authSlice';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getResolvedFrontendBaseUrl } from '../utils/frontendBaseUrl';
import { setPendingPaychanguOrder, setPaychanguRedirectAt, getPendingPaychanguOrder, isPendingPaychanguOrderFresh } from '../utils/pendingPaychanguOrder';
import { broadcastClientSync } from '../utils/crossTabSync';
import { useReconcilePendingPaychanguOrder } from '../hooks/useReconcilePendingPaychanguOrder';
import { useCompleteOrderPayment } from '../hooks/useCompleteOrderPayment';
import { UserRole, PaymentStatus } from '@shared/types';
import type { PaymentMethod } from '../../../shared/types';
import { DeliveryLocationSelector } from '../components/DeliveryLocationSelector';
import { useGetDeliveryLocationsQuery } from '../store/api/deliveryLocationApi';
import { JournalCard, JournalButton, JournalInput, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
import { ShoppingCart, MapPin, CreditCard, CheckCircle, User, Mail, Phone, Percent, ChevronRight, ArrowLeft, X, Pencil, Smartphone, Building2, Shield, Lock, Loader2 } from 'lucide-react';

export const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const guestCart = useAppSelector((state) => state.cart);
  const { items: cartItems, totalAmount, clearCart, isLoading: isCartLoading } = useCart();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const { shouldBlockCheckout, isCheckingPayment } = useReconcilePendingPaychanguOrder();

  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
  const [createBankTransferOrder, { isLoading: isCreatingBankTransferOrder }] = useCreateBankTransferOrderMutation();
  const [initiatePayment, { isLoading: isInitiatingPayment }] = useInitiatePaymentMutation();
  const { data: bankTransferDetails } = useGetBankTransferDetailsQuery();
  const { completePayment, isCompletingPayment } = useCompleteOrderPayment();

  const { data: pendingOrdersData } = useGetOrdersQuery(
    { status: 'pending', limit: 10 },
    { skip: !isAuthenticated }
  );

  const { orderId: localPendingOrderId } = getPendingPaychanguOrder();

  const resolvePendingUnpaidOrderId = (): string => {
    const pendingFromApi = pendingOrdersData?.orders?.find(
      (order) =>
        order.status === 'pending' &&
        (order.paymentStatus === PaymentStatus.PENDING ||
          order.paymentStatus === PaymentStatus.FAILED)
    );

    if (pendingFromApi) {
      return pendingFromApi._id;
    }

    // Authenticated users: trust API only so a stale local PayChangu marker
    // cannot resume an already-cancelled order.
    if (isAuthenticated) {
      return '';
    }

    if (isPendingPaychanguOrderFresh() && localPendingOrderId) {
      return localPendingOrderId;
    }

    return '';
  };

  // Guest information (only if not authenticated)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(
    user?.address && typeof user.address === 'object' ? user.address : null
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paychangu' as PaymentMethod);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);
  const [resendVerificationEmail, { isLoading: isResendingVerification, isSuccess: resendVerificationSuccess }] =
    useResendVerificationEmailMutation();

  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState('');

  const isLoading = isCreatingOrder || isCreatingBankTransferOrder || isInitiatingPayment || isCompletingPayment;

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      dispatch(showNotification({
        message: 'Admin accounts cannot place customer orders',
        type: 'error',
      }));
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, dispatch, navigate]);

  const { data: deliveryLocationsData } = useGetDeliveryLocationsQuery();
  const deliveryFee =
    deliveryLocationsData?.deliveryLocations.find((loc) => loc.town === shippingAddress?.town)
      ?.deliveryFee ?? 0;

  // Calculate final total with discount and delivery fee
  const finalTotal = Math.max(0, totalAmount - (guestCart.discount || 0)) + deliveryFee;

  // Checkout steps
  const CHECKOUT_STEPS = [
    { id: 1, name: 'Shipping', icon: MapPin },
    { id: 2, name: 'Payment', icon: CreditCard },
    { id: 3, name: 'Review', icon: CheckCircle },
  ];

  // Helper to check if address is valid
  const isAddressValid = (address: ShippingAddress | null): boolean => {
    if (!address) return false;
    if (address.landmark === 'Other/Custom') {
      return (address.customAddress || '').trim().length > 0;
    }
    if (address.customAddress) return address.customAddress.trim().length > 0;
    return !!(address.town && address.landmark);
  };

  // Step navigation functions
  const handleContinue = () => {
    if (currentStep === 1) {
      if (!isAddressValid(shippingAddress)) {
        if (shippingAddress?.landmark === 'Other/Custom') {
          setError('Please provide a delivery address');
        } else {
          setError('Please select a delivery location');
        }
        return;
      }
      setCurrentStep(2);
      setError('');
    } else if (currentStep === 2) {
      if (!paymentMethod) {
        setError('Please select a payment method');
        return;
      }
      setCurrentStep(3);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError('');
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setError('');
    }
  };

  const handleEditShipping = () => {
    setCurrentStep(1);
    setError('');
  };

  const handleEditPayment = () => {
    setCurrentStep(2);
    setError('');
  };

  // Payment method constants
  const PAYMENT_METHOD_PAYCHANGU = 'paychangu' as PaymentMethod;
  const PAYMENT_METHOD_BANK_TRANSFER = 'bank_transfer' as PaymentMethod;

  const ACCEPTED_PROOF_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  const MAX_PROOF_FILE_SIZE = 10 * 1024 * 1024; // 10MB, matches backend limit

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPaymentProofError('');

    if (!file) {
      setPaymentProofFile(null);
      return;
    }

    if (!ACCEPTED_PROOF_TYPES.includes(file.type)) {
      setPaymentProofError('Please upload a JPEG, PNG, WebP, GIF image or a PDF receipt.');
      setPaymentProofFile(null);
      return;
    }

    if (file.size > MAX_PROOF_FILE_SIZE) {
      setPaymentProofError('File is too large. Maximum size is 10MB.');
      setPaymentProofFile(null);
      return;
    }

    setPaymentProofFile(file);
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
      // Validate password if creating account
      if (createAccount) {
        if (!password.trim()) {
          setError('Please enter a password');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
      }
    }

    if (!isAddressValid(shippingAddress)) {
      if (shippingAddress?.landmark === 'Other/Custom') {
        setError('Please provide a delivery address');
      } else {
        setError('Please select a delivery location');
      }
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (paymentMethod === PAYMENT_METHOD_BANK_TRANSFER && !paymentProofFile) {
      setError('Please upload proof of payment to place a bank transfer order');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    try {
      const existingPendingOrderId = resolvePendingUnpaidOrderId();

      if (paymentMethod === PAYMENT_METHOD_PAYCHANGU && existingPendingOrderId) {
        dispatch(
          showNotification({
            message: 'Resuming payment on your existing pending order.',
            type: 'info',
          })
        );
        await clearCart();
        dispatch(removeCoupon());
        broadcastClientSync('orders');
        broadcastClientSync('products');

        await completePayment({
          orderId: existingPendingOrderId,
          guestEmail: !isAuthenticated ? guestEmail.trim() : undefined,
          phoneNumber: user?.phone || guestPhone.trim(),
        });
        return;
      }

      const orderItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      // Prepare order data
      const orderData: any = {
        items: orderItems,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod as PaymentMethod,
      };

      // Add coupon code if applied
      if (guestCart.appliedCoupon) {
        orderData.couponCode = guestCart.appliedCoupon.code;
      }

      // Add guest info if not authenticated
      if (!isAuthenticated) {
        orderData.guestInfo = {
          name: guestName.trim(),
          email: guestEmail.trim().toLowerCase(),
          phone: guestPhone.trim(),
        };
        // Add password if creating account
        if (createAccount && password) {
          orderData.password = password;
        }
      }

      // Create order first
      const orderResult =
        paymentMethod === PAYMENT_METHOD_BANK_TRANSFER
          ? await createBankTransferOrder({ ...orderData, proof: paymentProofFile as File }).unwrap()
          : await createOrder(orderData).unwrap();

      // If account was created, log the user in automatically. orderResult.token
      // is just a signal here (the actual session cookie is already set by the
      // server response) — not stored client-side.
      if (orderResult.token && orderResult.user) {
        dispatch(setUser({ user: orderResult.user }));
        broadcastClientSync('auth');
        dispatch(showNotification({
          message: 'Account created successfully! You are now logged in.',
          type: 'success'
        }));
      }

      // Clear cart as soon as the order is created — inventory is already reserved (BR-03).
      await clearCart();
      dispatch(removeCoupon());
      broadcastClientSync('orders');
      broadcastClientSync('products');

      // Initiate PayChangu payment and redirect to PayChangu checkout
      if (paymentMethod === PAYMENT_METHOD_PAYCHANGU) {
        // Use authenticated user email if account was created, otherwise use guest email
        const emailForUrl = orderResult.user?.email || guestEmail.trim();
        const frontendBaseUrl = getResolvedFrontendBaseUrl();
        const returnUrl = `${frontendBaseUrl}/payment/success?orderId=${orderResult.order._id}${!orderResult.user ? `&email=${encodeURIComponent(emailForUrl)}` : ''}`;
        const cancelUrl = `${frontendBaseUrl}/payment/cancel?orderId=${orderResult.order._id}${!orderResult.user ? `&email=${encodeURIComponent(emailForUrl)}` : ''}`;

        const paymentResult = await initiatePayment({
          orderId: orderResult.order._id,
          paymentMethod: paymentMethod as PaymentMethod,
          phoneNumber: orderResult.user?.phone || user?.phone || guestPhone.trim(),
          returnUrl,
          cancelUrl,
        }).unwrap();

        // If we get a redirect URL, redirect to PayChangu
        if (paymentResult.redirectUrl) {
          setPendingPaychanguOrder(
            orderResult.order._id,
            !orderResult.user && !isAuthenticated ? guestEmail.trim() : undefined
          );
          setPaychanguRedirectAt();
          window.location.href = paymentResult.redirectUrl;
          return;
        }
      }

      // For other payment methods, redirect to order confirmation

      // Store guest email in sessionStorage for order lookup if guest (and account wasn't created)
      if (!orderResult.user && !isAuthenticated) {
        sessionStorage.setItem('guestOrderEmail', guestEmail.trim());
      }

      // Navigate to order detail (email retrieved from sessionStorage, not URL for privacy)
      navigate(`/orders/${orderResult.order._id}`);
    } catch (err: any) {
      if (err?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setIsEmailNotVerified(true);
        return;
      }
      const errorInfo = getErrorInfo(err);
      setError(errorInfo.message);
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  // Loading state: server cart hasn't resolved yet for a logged-in user.
  // Without this guard, the empty-cart state below flashes first and can be
  // mistaken for data loss on a fresh page load.
  if (isCartLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-journal-teal mx-auto mb-4" aria-hidden />
          <JournalBody className="!text-journal-muted">Loading your cart...</JournalBody>
        </JournalCard>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-16">
          <ShoppingCart className="h-12 w-12 text-journal-faint mx-auto mb-4" />
          <CardHeading className="!text-[22px] mb-2">Your cart is empty</CardHeading>
          <JournalBody className="!text-journal-muted mb-6">
            Add some products to your cart before checkout.
          </JournalBody>
          <JournalButton variant="primary" onClick={() => navigate('/products')} className="mx-auto">
            Browse products
          </JournalButton>
        </JournalCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeading className="!text-[32px] sm:!text-[38px] mb-8">Checkout</PageHeading>

      {shouldBlockCheckout && (
        <JournalCard className="mb-6 bg-journal-warn-bg border-journal-warn-bg">
          <JournalBody className="!text-journal-warn-text">
            Confirming your recent payment attempt. Please wait a moment before placing another order.
          </JournalBody>
        </JournalCard>
      )}

      {!isAuthenticated && (
        <JournalCard className="mb-6 bg-journal-teal-tint border-journal-teal-tint-border">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <CardHeading className="!text-[18px] mb-2">Guest checkout</CardHeading>
              <JournalBody className="!text-journal-body mb-4">
                You're checking out as a guest. You can create an account after placing your order for faster checkout next time.
              </JournalBody>
              <div className="space-y-3">
                <JournalInput
                  label="Full name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
                <JournalInput
                  label="Email address"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
                <JournalInput
                  label="Phone number"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                  placeholder="+265XXXXXXXXX or 0XXXXXXXXX"
                />
              </div>
            </div>
          </div>
        </JournalCard>
      )}

      {/* Progress Indicator */}
      <JournalCard className="mb-8">
        <div className="flex items-center justify-between">
          {CHECKOUT_STEPS.map((step, index) => {
            const isActive = currentStep >= step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;

            return (
              <Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={cn(
                    'rounded-full p-2.5 transition-colors',
                    isActive ? 'bg-journal-ink text-journal-bone' : 'bg-journal-sand text-journal-faint'
                  )}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <span className={cn(
                    'ml-2.5 text-[13px] font-sans font-medium hidden sm:inline',
                    isActive ? 'text-journal-ink' : 'text-journal-faint'
                  )}>
                    {step.name}
                  </span>
                </div>
                {index < CHECKOUT_STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-px mx-3 sm:mx-4 transition-colors',
                    isCompleted ? 'bg-journal-ink' : 'bg-journal-hairline'
                  )} />
                )}
              </Fragment>
            );
          })}
        </div>
      </JournalCard>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Shipping Address */}
          {currentStep === 1 && (
            <JournalCard>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-journal-teal" />
                <CardHeading className="!text-[19px]">Shipping address</CardHeading>
              </div>
              <div>
                <DeliveryLocationSelector
                  value={shippingAddress}
                  onChange={setShippingAddress}
                  error={error && !isAddressValid(shippingAddress) ? error : undefined}
                  required
                />
              </div>
              <div className="mt-6 flex justify-end">
                <JournalButton
                  type="button"
                  variant="primary"
                  onClick={handleContinue}
                >
                  Continue
                  <ChevronRight className="h-3.5 w-3.5" />
                </JournalButton>
              </div>
            </JournalCard>
          )}

          {/* Step 2: Payment Method */}
          {currentStep === 2 && (
            <JournalCard>
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-4 w-4 text-journal-teal" />
                <CardHeading className="!text-[19px]">Payment method</CardHeading>
              </div>

              {/* PayChangu Payment Section */}
              <div className="border border-journal-hairline rounded-journal overflow-hidden">
                {/* PayChangu Header */}
                <div className="bg-journal-sand px-5 py-4 border-b border-journal-hairline">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <img
                        src="https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771401/autotek/payment%20methods/PayChangu_Logo-04_blue-DXGspjyy_zgdgpp.png"
                        alt="PayChangu"
                        className="h-8 w-auto"
                      />
                      <div className="border-l border-journal-hairline pl-4">
                        <p className="text-journal-body text-[13px] font-sans font-medium">Modern online payments for Malawi</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-journal-teal-tint border border-journal-teal-tint-border px-3 py-1 rounded-full">
                      <Shield className="h-3.5 w-3.5 text-journal-teal" />
                      <span className="text-journal-teal text-[11px] font-sans font-medium">Secure</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods Grid */}
                <div className="p-5">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PAYMENT_METHOD_PAYCHANGU}
                      checked={paymentMethod === PAYMENT_METHOD_PAYCHANGU}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="mt-1 w-4 h-4 text-journal-teal border-journal-input-border focus:ring-journal-teal"
                    />
                    <div className="ml-4 flex-1">
                      <p className="text-[13px] font-sans text-journal-muted mb-4">
                        Choose from multiple secure payment options:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {/* Cards */}
                        <div className="bg-white border border-journal-hairline rounded-journal p-4 hover:border-journal-ink transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-1.5 bg-journal-teal-tint rounded-journal">
                              <CreditCard className="h-4 w-4 text-journal-teal" />
                            </div>
                            <h4 className="font-sans font-semibold text-journal-ink text-[13px]">Cards</h4>
                          </div>
                          <p className="text-[12px] font-sans text-journal-muted">Visa, Mastercard</p>
                          <div className="mt-2 flex gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-journal-sand rounded text-[11px] font-sans font-medium text-journal-body">Visa</span>
                            <span className="px-2 py-0.5 bg-journal-sand rounded text-[11px] font-sans font-medium text-journal-body">Mastercard</span>
                          </div>
                        </div>

                        {/* Mobile Money */}
                        <div className="bg-white border border-journal-hairline rounded-journal p-4 hover:border-journal-ink transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-1.5 bg-journal-teal-tint rounded-journal">
                              <Smartphone className="h-4 w-4 text-journal-teal" />
                            </div>
                            <h4 className="font-sans font-semibold text-journal-ink text-[13px]">Mobile money</h4>
                          </div>
                          <p className="text-[12px] font-sans text-journal-muted">Instant mobile payments</p>
                          <div className="mt-2 flex gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-journal-sand rounded text-[11px] font-sans font-medium text-journal-body">Airtel</span>
                            <span className="px-2 py-0.5 bg-journal-sand rounded text-[11px] font-sans font-medium text-journal-body">TNM</span>
                          </div>
                        </div>
                      </div>

                      {/* Security Notice */}
                      <div className="flex items-start gap-2 bg-journal-sand rounded-journal p-3">
                        <Lock className="h-3.5 w-3.5 text-journal-body mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[12px] font-sans text-journal-ink font-medium">256-bit SSL encryption</p>
                          <p className="text-[12px] font-sans text-journal-muted mt-0.5">Your payment information is fully encrypted and secure. Licensed by Reserve Bank of Malawi.</p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Bank Transfer Payment Section */}
              <div className="mt-4 border border-journal-hairline rounded-journal overflow-hidden">
                <div className="bg-journal-sand px-5 py-4 border-b border-journal-hairline">
                  <div className="flex items-center gap-4">
                    <div className="p-1.5 bg-journal-teal-tint rounded-journal">
                      <Building2 className="h-5 w-5 text-journal-teal" />
                    </div>
                    <div>
                      <p className="text-journal-ink text-[13px] font-sans font-semibold">Bank transfer</p>
                      <p className="text-journal-body text-[12px] font-sans">Pay directly into our bank account</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PAYMENT_METHOD_BANK_TRANSFER}
                      checked={paymentMethod === PAYMENT_METHOD_BANK_TRANSFER}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="mt-1 w-4 h-4 text-journal-teal border-journal-input-border focus:ring-journal-teal"
                    />
                    <div className="ml-4 flex-1">
                      <p className="text-[13px] font-sans text-journal-muted mb-4">
                        Transfer the order total to our account, then upload your proof of payment.
                        Your order will be processed once our team manually verifies the transfer.
                      </p>

                      {paymentMethod === PAYMENT_METHOD_BANK_TRANSFER && (
                        <div className="space-y-4">
                          {bankTransferDetails && (
                            <div className="bg-white border border-journal-hairline rounded-journal p-4 space-y-1.5">
                              <div className="flex justify-between text-[13px] font-sans">
                                <span className="text-journal-muted">Bank</span>
                                <span className="text-journal-ink font-medium">{bankTransferDetails.bankName}</span>
                              </div>
                              <div className="flex justify-between text-[13px] font-sans">
                                <span className="text-journal-muted">Account name</span>
                                <span className="text-journal-ink font-medium">{bankTransferDetails.accountName}</span>
                              </div>
                              <div className="flex justify-between text-[13px] font-sans">
                                <span className="text-journal-muted">Account number</span>
                                <span className="text-journal-ink font-medium">{bankTransferDetails.accountNumber}</span>
                              </div>
                              <div className="flex justify-between text-[13px] font-sans">
                                <span className="text-journal-muted">Branch</span>
                                <span className="text-journal-ink font-medium">{bankTransferDetails.branch}</span>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[13px] font-sans font-medium text-journal-ink mb-1.5">
                              Upload proof of payment
                            </label>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                              onChange={handleProofFileChange}
                              className="block w-full text-[13px] font-sans text-journal-muted file:mr-4 file:py-2 file:px-4 file:rounded-journal file:border-0 file:text-[13px] file:font-sans file:font-medium file:bg-journal-teal-tint file:text-journal-teal hover:file:bg-journal-teal-tint-border"
                            />
                            <p className="text-[11px] font-sans text-journal-muted mt-1.5">
                              Screenshot or PDF receipt, up to 10MB.
                            </p>
                            {paymentProofFile && (
                              <p className="text-[12px] font-sans text-journal-teal mt-1.5">{paymentProofFile.name} selected</p>
                            )}
                            {paymentProofError && (
                              <p className="text-[12px] font-sans text-journal-danger-text mt-1.5">{paymentProofError}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <JournalButton
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </JournalButton>
                <JournalButton
                  type="button"
                  variant="primary"
                  onClick={handleContinue}
                >
                  Continue
                  <ChevronRight className="h-3.5 w-3.5" />
                </JournalButton>
              </div>
            </JournalCard>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <JournalCard>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-4 w-4 text-journal-teal" />
                  <CardHeading className="!text-[19px]">Review your order</CardHeading>
                </div>

                {/* Order Items Summary */}
                <div className="mb-6">
                  <h3 className="font-sans font-semibold text-[14px] text-journal-ink mb-3">Order items</h3>
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 p-3 bg-journal-sand rounded-journal">
                        {item.image && (
                          <img
                            src={item.image}
                            alt="Product"
                            className="w-14 h-14 object-cover rounded-journal"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-[13px] font-sans font-medium text-journal-ink">
                            Product ID: {item.productId.slice(0, 8)}...
                          </div>
                          <div className="text-[12px] font-sans text-journal-muted">
                            Qty: {item.quantity} × MWK {item.price.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-[13px] font-sans font-semibold text-journal-ink">
                          MWK {(item.quantity * item.price).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address Review */}
                <div className="mb-6 pb-6 border-b border-journal-hairline">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-journal-body" />
                      <h3 className="font-sans font-semibold text-[14px] text-journal-ink">Shipping address</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditShipping}
                      className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-teal hover:underline"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                  <JournalBody className="!text-journal-muted">
                    {shippingAddress?.customAddress
                      ? shippingAddress.town
                        ? `${shippingAddress.town} - ${shippingAddress.customAddress}`
                        : shippingAddress.customAddress
                      : shippingAddress?.town && shippingAddress?.landmark
                      ? `${shippingAddress.town}, ${shippingAddress.landmark}`
                      : 'No address provided'}
                  </JournalBody>
                </div>

                {/* Payment Method Review */}
                <div className="mb-6 pb-6 border-b border-journal-hairline">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-journal-body" />
                      <h3 className="font-sans font-semibold text-[14px] text-journal-ink">Payment method</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditPayment}
                      className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-teal hover:underline"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                  {paymentMethod === PAYMENT_METHOD_BANK_TRANSFER ? (
                    <div className="flex items-center gap-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal p-3">
                      <div className="p-1.5 bg-white rounded-journal flex-shrink-0">
                        <Building2 className="h-4 w-4 text-journal-teal" />
                      </div>
                      <div className="flex-1">
                        <p className="font-sans font-semibold text-journal-teal text-[13px]">Bank transfer</p>
                        <p className="text-[12px] font-sans text-journal-teal">
                          {paymentProofFile ? `Proof of payment attached: ${paymentProofFile.name}` : 'Proof of payment required'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal p-3">
                      <img
                        src="https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771401/autotek/payment%20methods/PayChangu_Logo-04_blue-DXGspjyy_zgdgpp.png"
                        alt="PayChangu"
                        className="h-6 w-auto flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-sans font-semibold text-journal-teal text-[13px]">Secure payment</p>
                          <Shield className="h-3.5 w-3.5 text-journal-teal" />
                        </div>
                        <p className="text-[12px] font-sans text-journal-teal">Cards, mobile money & bank transfer available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Applied Coupon */}
                {guestCart.appliedCoupon && (
                  <div className="mb-6 pb-6 border-b border-journal-hairline">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Percent className="h-3.5 w-3.5 text-journal-teal" />
                        <h3 className="font-sans font-semibold text-[14px] text-journal-ink">Applied coupon</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch(removeCoupon());
                          dispatch(showNotification({
                            message: 'Coupon removed',
                            type: 'success'
                          }));
                        }}
                        className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-danger-text hover:underline"
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                    <div className="p-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-sans font-medium text-journal-teal">
                            {guestCart.appliedCoupon.code}
                          </p>
                          <p className="text-[12px] font-sans text-journal-teal">
                            {guestCart.appliedCoupon.type === 'percentage'
                              ? `${guestCart.appliedCoupon.value}% off`
                              : `MWK ${guestCart.appliedCoupon.value.toLocaleString()} off`
                            }
                          </p>
                        </div>
                        <p className="text-[13px] font-sans font-semibold text-journal-teal">
                          -MWK {guestCart.discount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <JournalButton
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </JournalButton>
                </div>
              </JournalCard>
            </div>
          )}

          {/* Optional Account Creation (for guests) - Show on Step 1 and Step 2 */}
          {!isAuthenticated && (currentStep === 1 || currentStep === 2) && (
            <JournalCard className="bg-journal-sand">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => {
                    setCreateAccount(e.target.checked);
                    if (!e.target.checked) {
                      // Clear password fields when unchecking
                      setPassword('');
                      setConfirmPassword('');
                    }
                  }}
                  className="mt-1 h-4 w-4 text-journal-teal focus:ring-journal-teal border-journal-input-border rounded"
                />
                <div className="flex-1">
                  <p className="text-[13px] font-sans font-medium text-journal-ink mb-1">
                    Create an account for faster checkout next time
                  </p>
                  <p className="text-[12px] font-sans text-journal-muted">
                    {createAccount
                      ? 'Enter a password to create your account'
                      : `We'll send you a password setup link to ${guestEmail || 'your email'} after your order is placed.`
                    }
                  </p>
                </div>
              </label>

              {/* Password fields - shown when checkbox is checked */}
              {createAccount && (
                <div className="mt-4 space-y-4 pt-4 border-t border-journal-hairline">
                  <JournalInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={createAccount}
                    placeholder="Enter your password"
                  />
                  <JournalInput
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={createAccount}
                    placeholder="Confirm your password"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <div className="p-3 bg-journal-danger-bg border border-journal-error-border rounded-journal">
                      <p className="text-[13px] font-sans text-journal-danger-text">Passwords do not match</p>
                    </div>
                  )}
                  {password && password.length < 6 && (
                    <div className="p-3 bg-journal-warn-bg border border-journal-warn-bg rounded-journal">
                      <p className="text-[13px] font-sans text-journal-warn-text">Password must be at least 6 characters long</p>
                    </div>
                  )}
                </div>
              )}
            </JournalCard>
          )}

          {/* Login Prompt for Guests - Show on Step 1 and Step 2 */}
          {!isAuthenticated && (currentStep === 1 || currentStep === 2) && (
            <JournalCard className="bg-journal-teal-tint border-journal-teal-tint-border">
              <p className="text-[13px] font-sans text-journal-body">
                Already have an account?{' '}
                <Link to={`/login?returnUrl=/checkout`} className="text-journal-teal hover:underline font-medium">
                  Sign in
                </Link>
                {' '}for faster checkout and order tracking.
              </p>
            </JournalCard>
          )}

          {error && (
            <div className="p-4 bg-journal-danger-bg border border-journal-error-border rounded-journal">
              <p className="text-[13px] font-sans text-journal-danger-text">{error}</p>
            </div>
          )}

          {isEmailNotVerified && (
            <div className="p-4 bg-journal-danger-bg border border-journal-error-border rounded-journal">
              <p className="text-[13px] font-sans text-journal-danger-text mb-2">
                Please verify your email before placing an order.
              </p>
              {resendVerificationSuccess ? (
                <p className="text-[13px] font-sans text-journal-body">
                  If your account is unverified, a new verification link has been sent.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (!user?.email) return;
                    try {
                      await resendVerificationEmail({ email: user.email }).unwrap();
                    } catch {
                      // Enumeration-safe: backend always returns a generic success message.
                    }
                  }}
                  disabled={isResendingVerification}
                  className="text-[13px] font-sans font-medium text-journal-teal hover:underline disabled:opacity-60"
                >
                  {isResendingVerification ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <JournalCard className="sticky top-24">
            <CardHeading className="!text-[19px] mb-4">Order summary</CardHeading>

            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt="Product"
                      className="w-14 h-14 object-cover rounded-journal"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-[13px] font-sans font-medium text-journal-ink">
                      Product ID: {item.productId.slice(0, 8)}...
                    </div>
                    <div className="text-[12px] font-sans text-journal-muted">
                      Qty: {item.quantity} × MWK {item.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-journal-hairline pt-4 space-y-2">
              <div className="flex justify-between text-journal-body text-[13px] font-sans">
                <span>Subtotal</span>
                <span>MWK {totalAmount.toLocaleString()}</span>
              </div>
              {guestCart.discount > 0 && (
                <div className="flex justify-between text-journal-teal text-[13px] font-sans">
                  <span className="flex items-center gap-1.5">
                    <Percent className="h-3 w-3" />
                    Discount {guestCart.appliedCoupon?.code && `(${guestCart.appliedCoupon.code})`}
                  </span>
                  <span>-MWK {guestCart.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-journal-body text-[13px] font-sans">
                <span>Shipping</span>
                <span>
                  {shippingAddress?.town
                    ? `MWK ${deliveryFee.toLocaleString()}`
                    : 'Select a delivery location'}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-journal-hairline">
                <span className="font-sans font-semibold text-[15px] text-journal-ink">Total</span>
                <span className="font-journal text-[22px] text-journal-ink">MWK {finalTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Place Order Button - Only show on Review step (Step 3) */}
            {currentStep === 3 && (
              <JournalButton
                type="submit"
                variant="primary"
                className="w-full mt-6"
                disabled={isLoading || shouldBlockCheckout}
              >
                {isLoading || isCheckingPayment ? (
                  'Placing order...'
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Place order
                  </>
                )}
              </JournalButton>
            )}
          </JournalCard>
        </div>
      </form>
    </div>
  );
};
