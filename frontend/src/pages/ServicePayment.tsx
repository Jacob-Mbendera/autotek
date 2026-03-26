import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInitiatePaymentMutation } from '../store/api/paymentApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, H2, Body } from '../components/ui/Typography';
import { Loader2, CreditCard, Shield, ArrowLeft } from 'lucide-react';
import { PaymentMethod } from '@shared/types';

export const ServicePayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [initiatePayment, { isLoading }] = useInitiatePaymentMutation();

  const getFrontendBaseUrl = () => {
    const configuredBaseUrl = import.meta.env.VITE_BASE_URL?.trim();
    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/$/, '');
    }

    const currentOrigin = window.location.origin;
    if (import.meta.env.DEV && /^http:\/\/localhost(?::\d+)?$/.test(currentOrigin)) {
      return 'http://localhost:5173';
    }

    return currentOrigin;
  };

  const towingServiceId = searchParams.get('towingServiceId');
  const carServiceId = searchParams.get('carServiceId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (!towingServiceId && !carServiceId) {
      navigate('/my-services');
    }
  }, [towingServiceId, carServiceId, navigate]);

  const handlePayment = async () => {
    try {
      const baseUrl = getFrontendBaseUrl();
      const paymentData: any = {
        paymentMethod: PaymentMethod.PAYCHANGU,
        returnUrl: `${baseUrl}/payment/success`,
        cancelUrl: `${baseUrl}/payment/cancel`,
      };

      if (towingServiceId) {
        paymentData.towingServiceId = towingServiceId;
      } else if (carServiceId) {
        paymentData.carServiceId = carServiceId;
      }

      const result = await initiatePayment(paymentData).unwrap();

      // Redirect to PayChangu checkout
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        console.error('No redirect URL received');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/my-services')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Services
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full mb-4">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <H1 className="text-3xl font-bold text-gray-900 mb-2">Pay for Service</H1>
            <Body className="text-gray-600">
              Complete your payment to confirm your service request
            </Body>
          </div>

          {amount && (
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <Body className="text-sm text-gray-600 mb-1">Total Amount</Body>
                <H2 className="text-4xl font-bold text-teal-700">
                  MWK {parseInt(amount).toLocaleString()}
                </H2>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Secure Payment</p>
                <p className="text-sm text-blue-700">
                  Your payment is processed securely through PayChangu. We never store your card
                  details.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full"
              size="large"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>

            <div className="text-center">
              <Body className="text-sm text-gray-500">
                Powered by{' '}
                <a
                  href="https://paychangu.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  PayChangu
                </a>
              </Body>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Body className="text-sm text-gray-500">
            By proceeding, you agree to our terms and conditions
          </Body>
        </div>
      </div>
    </div>
  );
};
