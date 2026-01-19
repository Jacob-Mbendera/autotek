import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card variant="md" className="text-center">
        <XCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
        <H1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</H1>
        <Body className="text-gray-600 mb-6">
          Your payment was cancelled. No charges have been made to your account.
        </Body>

        {orderId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <Body className="text-sm text-amber-800">
              Your order (#{orderId.slice(0, 8)}...) is still pending. You can complete the payment
              to confirm your order.
            </Body>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderId && (
            <Button
              variant="primary"
              onClick={() => navigate(`/checkout?orderId=${orderId}`)}
              className="flex items-center justify-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              Retry Payment
            </Button>
          )}
          <Button
            variant="secondary"
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
