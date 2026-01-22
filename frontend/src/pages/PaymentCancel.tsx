import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetOrderQuery } from '../store/api/orderApi';
import { useGetPaymentByOrderQuery } from '../store/api/paymentApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { XCircle, ArrowLeft, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { PaymentStatus } from '@shared/types';

export const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const { data: orderData, isLoading: isLoadingOrder } = useGetOrderQuery(
    orderId || '',
    { skip: !orderId }
  );

  const { data: paymentData, isLoading: isLoadingPayment } = useGetPaymentByOrderQuery(
    orderId || '',
    { skip: !orderId }
  );

  const isLoading = isLoadingOrder || isLoadingPayment;
  const order = orderData?.order;
  const payment = paymentData?.payment;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center">
          <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
          <Body className="text-gray-600">Loading order information...</Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card variant="md" className="text-center">
        <XCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
        <H1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</H1>
        <Body className="text-gray-600 mb-6">
          Your payment was cancelled. No charges have been made to your account.
        </Body>

        {orderId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <Body className="font-medium text-amber-800">Order Still Pending</Body>
            </div>
            <Body className="text-sm text-amber-700 mb-3">
              Your order (#{orderId.slice(0, 8)}...) is still pending. You can complete the payment
              to confirm your order.
            </Body>
            {order && (
              <div className="mt-3 pt-3 border-t border-amber-200 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Order Total:</span>
                  <span className="font-medium text-amber-900">
                    MWK {order.totalAmount?.toLocaleString() || '0'}
                  </span>
                </div>
                {payment && (
                  <div className="flex justify-between">
                    <span className="text-amber-700">Payment Method:</span>
                    <span className="font-medium text-amber-900 capitalize">
                      {payment.paymentMethod.replace('-', ' ')}
                    </span>
                  </div>
                )}
                {payment?.status === PaymentStatus.FAILED && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <Body className="text-xs text-amber-600">
                      Payment failed. Please try again with a different payment method if needed.
                    </Body>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderId && (
            <>
              <Button
                variant="primary"
                onClick={() => navigate(`/orders/${orderId}`)}
                className="flex items-center justify-center gap-2"
              >
                View Order
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/checkout?orderId=${orderId}`)}
                className="flex items-center justify-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Retry Payment
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            onClick={() => navigate('/products')}
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Continue Shopping
          </Button>
        </div>
      </Card>
    </div>
  );
};
