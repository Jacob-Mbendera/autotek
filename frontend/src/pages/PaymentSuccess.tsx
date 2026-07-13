import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../store/types';
import { useGetOrderQuery } from '../store/api/orderApi';
import { useGetPaymentByOrderQuery, useVerifyPaymentMutation } from '../store/api/paymentApi';
import { baseApi } from '../store/api/baseApi';
import { clearCart } from '../store/slices/cartSlice';
import { clearPendingPaychanguOrder, clearPaychanguRedirectAt } from '../utils/pendingPaychanguOrder';
import { broadcastClientSync } from '../utils/crossTabSync';
import {
  clearPendingPaychanguService,
  getPendingPaychanguService,
  setServicePayNowUiHold,
} from '../utils/pendingPaychanguService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { CheckCircle, Package, Loader2, Truck, Wrench } from 'lucide-react';
import { PaymentStatus } from '@shared/types';

type ServiceVerifyState = 'idle' | 'loading' | 'success' | 'error';

interface ServicePaymentSummary {
  amount: number;
  type: string;
  status: string;
  transactionId?: string;
}

export const PaymentSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const email = searchParams.get('email');
  const txRef = searchParams.get('tx_ref');

  const isOrderPayment = Boolean(orderId);
  const isServicePaymentReturn = Boolean(txRef) && !orderId;

  const [paymentVerified, setPaymentVerified] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const maxVerificationAttempts = 5;
  const hasClearedCartRef = useRef(false);

  const [serviceVerifyState, setServiceVerifyState] = useState<ServiceVerifyState>('idle');
  const [servicePaymentSummary, setServicePaymentSummary] = useState<ServicePaymentSummary | null>(
    null
  );

  const { data: orderData, isLoading: isLoadingOrder, error: orderError } = useGetOrderQuery(
    { id: orderId || '', email: email || undefined },
    { skip: !orderId }
  );

  const { data: paymentData, isLoading: isLoadingPayment, refetch: refetchPayment } =
    useGetPaymentByOrderQuery(orderId || '', { skip: !orderId });

  const [verifyPayment] = useVerifyPaymentMutation();

  const clearCartOnce = () => {
    if (!hasClearedCartRef.current) {
      dispatch(clearCart());
      clearPendingPaychanguOrder();
      clearPaychanguRedirectAt();
      broadcastClientSync('orders');
      hasClearedCartRef.current = true;
    }
  };

  useEffect(() => {
    if (!isOrderPayment && !isServicePaymentReturn) {
      navigate('/');
    }
  }, [isOrderPayment, isServicePaymentReturn, navigate]);

  useEffect(() => {
    if (!isServicePaymentReturn || !txRef) {
      return;
    }

    setServiceVerifyState('loading');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${apiBase}/payments/verify-txref?tx_ref=${encodeURIComponent(txRef)}`;

    fetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || 'Verification failed');
        }
        if (data?.verified || data?.payment?.status === PaymentStatus.COMPLETED) {
          const p = data.payment;
          setServicePaymentSummary({
            amount: p?.amount ?? 0,
            type: p?.type ?? 'service',
            status: p?.status ?? PaymentStatus.COMPLETED,
            transactionId: p?.transactionId,
          });
          setServiceVerifyState('success');
          const pend = getPendingPaychanguService();
          const holdSid = pend.towingServiceId || pend.carServiceId;
          if (holdSid) {
            setServicePayNowUiHold(holdSid, 8000);
          }
          clearPendingPaychanguService();
          dispatch(
            baseApi.util.invalidateTags([
              'Order',
              'TowingService',
              'CarService',
              'Payment',
              'Admin',
            ])
          );
        } else {
          setServiceVerifyState('error');
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('Service payment verify error:', err);
        }
        setServiceVerifyState('error');
      });
  }, [isServicePaymentReturn, txRef, dispatch]);

  useEffect(() => {
    if (!isOrderPayment || !orderId) {
      return;
    }

    if (txRef || orderId) {
      fetch(
        `${import.meta.env.VITE_API_URL}/payments/verify-txref?orderId=${orderId}${
          txRef ? `&tx_ref=${encodeURIComponent(txRef)}` : ''
        }`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data?.verified || data?.payment?.status === PaymentStatus.COMPLETED) {
            setPaymentVerified(true);
            clearCartOnce();
            dispatch(baseApi.util.invalidateTags(['Order', 'Payment', 'Admin']));
          }
          setTimeout(() => refetchPayment(), 1000);
        })
        .catch((err) => {
          if (import.meta.env.DEV) {
            console.error('Auto-verification error:', err);
          }
        });
    }

    if (paymentData?.payment) {
      const payment = paymentData.payment;
      if (payment.status === PaymentStatus.COMPLETED) {
        setPaymentVerified(true);
        clearCartOnce();
      } else if (payment.status === PaymentStatus.FAILED) {
        navigate(`/payment/cancel?orderId=${orderId}`);
      } else if (
        payment.status === PaymentStatus.PENDING &&
        verificationAttempts < maxVerificationAttempts
      ) {
        const verifyTimer = setTimeout(async () => {
          try {
            const verifyResult = await verifyPayment(payment._id).unwrap();
            if (verifyResult?.verified || verifyResult?.payment?.status === PaymentStatus.COMPLETED) {
              setPaymentVerified(true);
              clearCartOnce();
            }
            setVerificationAttempts((prev) => prev + 1);
            refetchPayment();
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('Payment verification error:', error);
            }
            setVerificationAttempts((prev) => prev + 1);
          }
        }, 2000);

        return () => clearTimeout(verifyTimer);
      }
    }
  }, [
    isOrderPayment,
    orderId,
    txRef,
    paymentData,
    dispatch,
    navigate,
    verifyPayment,
    refetchPayment,
    verificationAttempts,
  ]);

  useEffect(() => {
    if (!orderId || !paymentData?.payment || paymentData.payment.status !== PaymentStatus.PENDING) {
      return;
    }

    if (verificationAttempts >= maxVerificationAttempts) {
      return;
    }

    const pollInterval = setInterval(() => {
      refetchPayment();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderId, paymentData, refetchPayment, verificationAttempts]);

  if (!isOrderPayment && !isServicePaymentReturn) {
    return null;
  }

  if (isServicePaymentReturn) {
    if (serviceVerifyState === 'loading' || serviceVerifyState === 'idle') {
      return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card variant="md" className="text-center">
            <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
            <Body className="text-gray-600">Confirming your service payment...</Body>
          </Card>
        </div>
      );
    }

    if (serviceVerifyState === 'error') {
      return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card variant="md" className="text-center">
            <H1 className="text-2xl mb-4 text-amber-800">Could not confirm payment</H1>
            <Body className="text-gray-600 mb-6">
              If you completed payment, your booking may still update in a moment. Check My Services or
              contact support with your transaction reference.
            </Body>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" onClick={() => navigate('/my-services')}>
                My Services
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    const serviceLabel =
      servicePaymentSummary?.type === 'towing'
        ? 'Towing'
        : servicePaymentSummary?.type === 'car-service'
          ? 'Garage / workshop'
          : 'Service';

    const ServiceIcon = servicePaymentSummary?.type === 'towing' ? Truck : Wrench;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <H1 className="text-3xl font-bold text-gray-900 mb-2">Payment successful</H1>
          <Body className="text-gray-600 mb-6">
            Thank you. Your service payment in Malawi Kwacha (MWK) was received.
          </Body>

          {servicePaymentSummary && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <div className="flex items-center gap-2 mb-4">
                <ServiceIcon className="h-5 w-5 text-teal-600" />
                <H1 className="text-xl font-semibold">{serviceLabel}</H1>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount paid</span>
                  <span className="font-medium text-gray-900">
                    MWK {Number(servicePaymentSummary.amount).toLocaleString()}
                  </span>
                </div>
                {servicePaymentSummary.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reference</span>
                    <span className="font-medium text-gray-900 font-mono text-xs break-all text-right max-w-[65%]">
                      {servicePaymentSummary.transactionId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" onClick={() => navigate('/my-services')}>
              View My Services
            </Button>
            <Button variant="secondary" onClick={() => navigate('/services')}>
              Browse services
            </Button>
          </div>
        </Card>
      </div>
    );
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
                  {paymentVerified
                    ? 'Paid'
                    : payment?.status === PaymentStatus.PENDING
                      ? 'Verifying...'
                      : 'Processing'}
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
