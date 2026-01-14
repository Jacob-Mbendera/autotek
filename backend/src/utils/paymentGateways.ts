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

export const initiatePayment = async (
  method: PaymentMethod,
  request: PaymentRequest
): Promise<PaymentResponse> => {
  switch (method) {
    case PaymentMethod.AIRTEL_MONEY:
      return initiateAirtelMoneyPayment(request);
    case PaymentMethod.BANK_TRANSFER:
      return initiateBankTransfer(request);
    default:
      return {
        success: false,
        message: 'Invalid payment method',
      };
  }
};
