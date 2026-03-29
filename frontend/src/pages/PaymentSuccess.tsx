import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../store/types';
import { useGetOrderQuery } from '../store/api/orderApi';
import { useGetPaymentByOrderQuery, useVerifyPaymentMutation } from '../store/api/paymentApi';
import { clearCart } from '../store/slices/cartSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { CheckCircle, Package, Loader2, AlertCircle } from 'lucide-react';
import { PaymentStatus } from '@shared/types';

export const PaymentSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const email = searchParams.get('email');
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const maxVerificationAttempts = 5;
  const hasClearedCartRef = useRef(false);

  const { data: orderData, isLoading: isLoadingOrder, error: orderError } = useGetOrderQuery(
    { id: orderId || '', email: email || undefined },
    { skip: !orderId }
  );

  // Get payment associated with order - refetch every 3 seconds if pending
  const { data: paymentData, isLoading: isLoadingPayment, refetch: refetchPayment } = useGetPaymentByOrderQuery(
    orderId || '',
    { skip: !orderId }
  );

  const [verifyPayment, { isLoading: isVerifying }] = useVerifyPaymentMutation();

  const clearCartOnce = () => {
    if (!hasClearedCartRef.current) {
      dispatch(clearCart());
      hasClearedCartRef.current = true;
    }
  };

  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }

    // For PayChangu payments, automatically verify when user lands on success page
    const txRef = searchParams.get('tx_ref');
    if (txRef || orderId) {
      // Call verify endpoint to mark payment as complete
      fetch(`${import.meta.env.VITE_API_URL}/payments/verify-txref?orderId=${orderId}${txRef ? `&tx_ref=${txRef}` : ''}`)
        .then(res => res.json())
        .then((data) => {
          if (data?.verified || data?.payment?.status === PaymentStatus.COMPLETED) {
            setPaymentVerified(true);
            clearCartOnce();
          }
          // Refetch payment after verification
          setTimeout(() => refetchPayment(), 1000);
        })
        .catch(err => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Auto-verification error:', err);
          }
        });
    }

    // Verify payment status
    if (paymentData?.payment) {
      const payment = paymentData.payment;
      if (payment.status === PaymentStatus.COMPLETED) {
        setPaymentVerified(true);
        clearCartOnce();
      } else if (payment.status === PaymentStatus.FAILED) {
        // Payment failed, redirect to cancel page
        navigate(`/payment/cancel?orderId=${orderId}`);
      } else if (payment.status === PaymentStatus.PENDING && verificationAttempts < maxVerificationAttempts) {
        // For PayChangu, payment might be pending - try to verify
        const verifyTimer = setTimeout(async () => {
          try {
            const verifyResult = await verifyPayment(payment._id).unwrap();
            if (verifyResult?.verified || verifyResult?.payment?.status === PaymentStatus.COMPLETED) {
              setPaymentVerified(true);
              clearCartOnce();
            }
            setVerificationAttempts(prev => prev + 1);
            refetchPayment();
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
            console.error('Payment verification error:', error);
            }
            setVerificationAttempts(prev => prev + 1);
          }
        }, 2000);

        return () => clearTimeout(verifyTimer);
      }
    }
  }, [orderId, paymentData, dispatch, navigate, verifyPayment, refetchPayment, verificationAttempts]);

  // Poll for payment status if still pending
  useEffect(() => {
    if (!paymentData?.payment || paymentData.payment.status !== PaymentStatus.PENDING) {
      return;
    }

    if (verificationAttempts >= maxVerificationAttempts) {
      return;
    }

    const pollInterval = setInterval(() => {
      refetchPayment();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [paymentData, refetchPayment, verificationAttempts]);

  if (!orderId) {
    return null;
  }

  if (isLoadingOrder || isLoadingPayment) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center">
          <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
          <Body className="text-gray-600">Verifying payment...</Body>
        </Card>
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center">
          <H1 className="text-2xl mb-4 text-red-600">Error</H1>
          <Body className="text-gray-600 mb-6">
            Unable to verify your order. Please contact support if you have any questions.
          </Body>
          <Button variant="primary" onClick={() => navigate('/orders')}>
            View Orders
          </Button>
        </Card>
      </div>
    );
  }

  const order = orderData?.order;
  const payment = paymentData?.payment;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card variant="md" className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <H1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</H1>
        <Body className="text-gray-600 mb-6">
          Thank you for your purchase. Your payment has been processed successfully.
        </Body>

        {payment?.status === PaymentStatus.PENDING && !paymentVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
              <Body className="font-medium text-amber-800">Verifying Payment</Body>
            </div>
            <Body className="text-sm text-amber-700">
              Your payment is being verified. This may take a few moments. Please do not close this page.
            </Body>
          </div>
        )}

        {order && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-teal-600" />
              <H1 className="text-xl font-semibold">Order Details</H1>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium text-gray-900">{order._id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium text-gray-900">
                  MWK {order.totalAmount.toLocaleString()}
                </span>
              </div>
              {payment && payment.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {payment.paymentMethod.replace('-', ' ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600 capitalize">
                  {paymentVerified ? 'Paid' : payment?.status === PaymentStatus.PENDING ? 'Verifying...' : 'Processing'}
                </span>
              </div>
              {payment?.transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium text-gray-900 font-mono text-xs">
                    {payment.transactionId}
                  </span>
                </div>
              )}
              {payment?.reference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-medium text-gray-900 font-mono text-xs">
                    {payment.reference}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" onClick={() => navigate(`/orders/${orderId}`)}>
            View Order Details
          </Button>
          <Button variant="secondary" onClick={() => navigate('/products')}>
            Continue Shopping
          </Button>
        </div>
      </Card>
    </div>
  );
};
