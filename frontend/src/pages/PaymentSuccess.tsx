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
import { JournalCard, JournalButton, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { CheckCircle, Package, Loader2, Truck, Wrench, AlertTriangle } from 'lucide-react';
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
  const [verificationTimedOut, setVerificationTimedOut] = useState(false);
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

    fetch(url, {
      credentials: 'include',
    })
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
        }${email ? `&email=${encodeURIComponent(email)}` : ''}`,
        { credentials: 'include' }
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
      } else if (payment.status === PaymentStatus.PENDING && verificationAttempts >= maxVerificationAttempts) {
        // Gateway never confirmed the payment after repeated checks (e.g. the
        // customer's card was declined and PayChangu never redirected back
        // with a success result). Stop polling and tell the customer instead
        // of leaving them on an infinite "Verifying Payment" spinner.
        setVerificationTimedOut(true);
      } else if (
        payment.status === PaymentStatus.PENDING &&
        verificationAttempts < maxVerificationAttempts
      ) {
        const verifyTimer = setTimeout(async () => {
          try {
            const verifyResult = await verifyPayment({
              orderId: orderId || undefined,
              txRef: txRef || undefined,
              email: email || undefined,
            }).unwrap();
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
    email,
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
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <JournalCard className="text-center py-10">
            <Loader2 className="h-10 w-10 text-journal-teal animate-spin mx-auto mb-4" />
            <JournalBody className="!text-journal-muted">Confirming your service payment...</JournalBody>
          </JournalCard>
        </div>
      );
    }

    if (serviceVerifyState === 'error') {
      return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <JournalCard className="text-center py-10">
            <CardHeading className="!text-[22px] mb-4 !text-journal-warn-text">Could not confirm payment</CardHeading>
            <JournalBody className="!text-journal-muted mb-6">
              If you completed payment, your booking may still update in a moment. Check My Services or
              contact support with your transaction reference.
            </JournalBody>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <JournalButton variant="primary" onClick={() => navigate('/my-services')}>
                My services
              </JournalButton>
              <JournalButton variant="secondary" onClick={() => navigate('/')}>
                Home
              </JournalButton>
            </div>
          </JournalCard>
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-10">
          <CheckCircle className="h-14 w-14 text-journal-teal mx-auto mb-4" />
          <PageHeading className="!text-[32px] mb-2">Payment successful</PageHeading>
          <JournalBody className="!text-journal-muted mb-6">
            Thank you. Your service payment in Malawi Kwacha (MWK) was received.
          </JournalBody>

          {servicePaymentSummary && (
            <div className="bg-journal-sand rounded-journal p-6 mb-6 text-left">
              <div className="flex items-center gap-2 mb-4">
                <ServiceIcon className="h-4 w-4 text-journal-teal" />
                <h2 className="font-journal text-[19px] text-journal-ink">{serviceLabel}</h2>
              </div>
              <div className="space-y-2 text-[13px] font-sans">
                <div className="flex justify-between">
                  <span className="text-journal-muted">Amount paid</span>
                  <span className="font-medium text-journal-ink">
                    MWK {Number(servicePaymentSummary.amount).toLocaleString()}
                  </span>
                </div>
                {servicePaymentSummary.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-journal-muted">Reference</span>
                    <span className="font-medium text-journal-ink font-mono text-[11px] break-all text-right max-w-[65%]">
                      {servicePaymentSummary.transactionId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <JournalButton variant="primary" onClick={() => navigate('/my-services')}>
              View my services
            </JournalButton>
            <JournalButton variant="secondary" onClick={() => navigate('/services')}>
              Browse services
            </JournalButton>
          </div>
        </JournalCard>
      </div>
    );
  }

  if (isLoadingOrder || isLoadingPayment) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-10">
          <Loader2 className="h-10 w-10 text-journal-teal animate-spin mx-auto mb-4" />
          <JournalBody className="!text-journal-muted">Verifying payment...</JournalBody>
        </JournalCard>
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-10">
          <CardHeading className="!text-[22px] mb-4 !text-journal-danger-text">Error</CardHeading>
          <JournalBody className="!text-journal-muted mb-6">
            Unable to verify your order. Please contact support if you have any questions.
          </JournalBody>
          <JournalButton variant="primary" onClick={() => navigate('/orders')}>
            View orders
          </JournalButton>
        </JournalCard>
      </div>
    );
  }

  const order = orderData?.order;
  const payment = paymentData?.payment;

  if (verificationTimedOut && payment?.status === PaymentStatus.PENDING && !paymentVerified) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-10">
          <AlertTriangle className="h-14 w-14 text-journal-warn-text mx-auto mb-4" />
          <PageHeading className="!text-[28px] mb-2">We couldn't confirm your payment</PageHeading>
          <JournalBody className="!text-journal-muted mb-6">
            Your payment hasn't gone through yet, or the card issuer declined it. If money was taken
            from your account, it will be refunded automatically — no charge was recorded on this order.
            You can try paying again or contact support with your order reference.
          </JournalBody>

          <div className="bg-journal-sand rounded-journal p-4 mb-6 text-left text-[13px] font-sans space-y-2">
            <div className="flex justify-between">
              <span className="text-journal-muted">Order ID:</span>
              <span className="font-medium text-journal-ink">{orderId?.slice(0, 8)}...</span>
            </div>
            {payment?.transactionId && (
              <div className="flex justify-between">
                <span className="text-journal-muted">Transaction ID:</span>
                <span className="font-medium text-journal-ink font-mono text-[11px]">
                  {payment.transactionId}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <JournalButton
              variant="primary"
              onClick={() =>
                navigate(
                  email ? `/orders/${orderId}?email=${encodeURIComponent(email)}` : `/orders/${orderId}`
                )
              }
            >
              View order
            </JournalButton>
            <JournalButton variant="secondary" onClick={() => navigate('/products')}>
              Continue shopping
            </JournalButton>
          </div>
        </JournalCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <JournalCard className="text-center py-10">
        <CheckCircle className="h-14 w-14 text-journal-teal mx-auto mb-4" />
        <PageHeading className="!text-[32px] mb-2">Payment successful!</PageHeading>
        <JournalBody className="!text-journal-muted mb-6">
          Thank you for your purchase. Your payment has been processed successfully.
        </JournalBody>

        {payment?.status === PaymentStatus.PENDING && !paymentVerified && (
          <div className="bg-journal-warn-bg border border-journal-warn-bg rounded-journal p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 text-journal-warn-text animate-spin" />
              <p className="font-sans font-medium text-[13px] text-journal-warn-text">Verifying payment</p>
            </div>
            <p className="text-[12px] font-sans text-journal-warn-text">
              Your payment is being verified. This may take a few moments. Please do not close this page.
            </p>
          </div>
        )}

        {order && (
          <div className="bg-journal-sand rounded-journal p-6 mb-6 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-journal-teal" />
              <h2 className="font-journal text-[19px] text-journal-ink">Order details</h2>
            </div>
            <div className="space-y-2 text-[13px] font-sans">
              <div className="flex justify-between">
                <span className="text-journal-muted">Order ID:</span>
                <span className="font-medium text-journal-ink">{order._id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-journal-muted">Total amount:</span>
                <span className="font-medium text-journal-ink">
                  MWK {order.totalAmount.toLocaleString()}
                </span>
              </div>
              {payment && payment.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-journal-muted">Payment method:</span>
                  <span className="font-medium text-journal-ink capitalize">
                    {payment.paymentMethod.replace('-', ' ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-journal-muted">Status:</span>
                <span className="font-medium text-journal-teal capitalize">
                  {paymentVerified
                    ? 'Paid'
                    : payment?.status === PaymentStatus.PENDING
                      ? 'Verifying...'
                      : 'Processing'}
                </span>
              </div>
              {payment?.transactionId && (
                <div className="flex justify-between">
                  <span className="text-journal-muted">Transaction ID:</span>
                  <span className="font-medium text-journal-ink font-mono text-[11px]">
                    {payment.transactionId}
                  </span>
                </div>
              )}
              {payment?.reference && (
                <div className="flex justify-between">
                  <span className="text-journal-muted">Reference:</span>
                  <span className="font-medium text-journal-ink font-mono text-[11px]">
                    {payment.reference}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <JournalButton
            variant="primary"
            onClick={() =>
              navigate(
                email
                  ? `/orders/${orderId}?email=${encodeURIComponent(email)}`
                  : `/orders/${orderId}`
              )
            }
          >
            View order details
          </JournalButton>
          <JournalButton variant="secondary" onClick={() => navigate('/products')}>
            Continue shopping
          </JournalButton>
        </div>
      </JournalCard>
    </div>
  );
};
