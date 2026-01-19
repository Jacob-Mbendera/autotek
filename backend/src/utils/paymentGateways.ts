import { PaymentMethod } from '../types/shared';
import { requestToPay as airtelRequestToPay } from '../services/airtelMoneyService';
import { formatAmount } from './currency';

// Payment gateway integrations for Malawi
// Currency: MWK (Malawi Kwacha)
// Phone format: +265XXXXXXXXX or 0XXXXXXXXX

export interface PaymentRequest {
  amount: number;
  phoneNumber: string;
  reference: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  paymentInstructions?: string;
  redirectUrl?: string; // For PayChangu Standard Checkout
  error?: string;
}

// Airtel Money integration
export const initiateAirtelMoneyPayment = async (
  request: PaymentRequest
): Promise<PaymentResponse> => {
  try {
    const result = await airtelRequestToPay({
      phoneNumber: request.phoneNumber,
      amount: request.amount,
      externalId: request.reference,
      description: request.description,
    });

    if (result.success && result.transactionId) {
      return {
        success: true,
        transactionId: result.transactionId,
        message: result.message || 'Payment initiated successfully',
        paymentInstructions: `Airtel Money payment request sent. Please approve the payment on your phone. Reference: ${request.reference}`,
      };
    }

    return {
      success: false,
      message: result.error || result.message || 'Failed to initiate Airtel Money payment',
      error: result.error,
    };
  } catch (error: any) {
    console.error('Error in initiateAirtelMoneyPayment:', error);
    
    // Provide more helpful error message for missing credentials
    if (error.message && error.message.includes('credentials not configured')) {
      return {
        success: false,
        message: 'Airtel Money API credentials not configured. Please set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env file',
        error: error.message,
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to initiate Airtel Money payment',
      error: error.message,
    };
  }
};

// Bank Transfer (manual verification)
export const initiateBankTransfer = async (
  request: PaymentRequest
): Promise<PaymentResponse> => {
  try {
    // Bank transfer requires manual verification
    const transactionId = `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const formattedAmount = formatAmount(request.amount);

    return {
      success: true,
      transactionId,
      message: 'Bank transfer instructions generated',
      paymentInstructions: `Please transfer ${formattedAmount} to:\nBank: [Bank Name]\nAccount: [Account Number]\nReference: ${request.reference}\n\nAfter transfer, please contact support with your transaction receipt.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to initiate bank transfer',
      error: error.message,
    };
  }
};

// PayChangu Standard Checkout integration
export const initiatePayChanguPayment = async (
  request: PaymentRequest,
  returnUrl: string,
  cancelUrl: string
): Promise<PaymentResponse> => {
  try {
    const apiKey = process.env.PAYCHANGU_API_KEY;
    const apiSecret = process.env.PAYCHANGU_API_SECRET;
    const baseUrl = process.env.PAYCHANGU_BASE_URL || 'https://api.paychangu.com';

    if (!apiKey || !apiSecret) {
      return {
        success: false,
        message: 'PayChangu API credentials not configured. Please set PAYCHANGU_API_KEY and PAYCHANGU_API_SECRET in .env file',
        error: 'PayChangu credentials not configured',
      };
    }

    // Generate unique transaction reference
    const transactionId = `PAYCHANGU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare PayChangu Standard Checkout request
    const checkoutData = {
      amount: request.amount,
      currency: 'MWK',
      reference: request.reference || transactionId,
      description: request.description || 'AutoTek Order Payment',
      returnUrl: returnUrl,
      cancelUrl: cancelUrl,
      customer: {
        phone: request.phoneNumber,
      },
    };

    // Make API call to PayChangu to create checkout session
    const response = await fetch(`${baseUrl}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Secret': apiSecret,
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      return {
        success: false,
        message: errorData.message || 'Failed to create PayChangu checkout session',
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      success?: boolean;
      checkoutUrl?: string;
      sessionId?: string;
      message?: string;
      error?: string;
    };

    if (data.success && data.checkoutUrl) {
      return {
        success: true,
        transactionId: data.sessionId || transactionId,
        message: 'PayChangu checkout session created',
        redirectUrl: data.checkoutUrl, // URL to redirect user to PayChangu payment page
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to create PayChangu checkout session',
      error: data.error,
    };
  } catch (error: any) {
    console.error('Error in initiatePayChanguPayment:', error);
    return {
      success: false,
      message: error.message || 'Failed to initiate PayChangu payment',
      error: error.message,
    };
  }
};

export const initiatePayment = async (
  method: PaymentMethod,
  request: PaymentRequest,
  returnUrl?: string,
  cancelUrl?: string
): Promise<PaymentResponse> => {
  switch (method) {
    case PaymentMethod.AIRTEL_MONEY:
      return initiateAirtelMoneyPayment(request);
    case PaymentMethod.BANK_TRANSFER:
      return initiateBankTransfer(request);
    case PaymentMethod.PAYCHANGU:
      if (!returnUrl || !cancelUrl) {
        return {
          success: false,
          message: 'Return URL and Cancel URL are required for PayChangu',
        };
      }
      return initiatePayChanguPayment(request, returnUrl, cancelUrl);
    default:
      return {
        success: false,
        message: 'Invalid payment method',
      };
  }
};
