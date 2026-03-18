import Payment from '../models/Payment';
import { PaymentMethod } from '../types/shared';

// PayChangu Refund API Integration
// Documentation: Contact developer@paychangu.com for refund API documentation

export interface RefundRequest {
  transactionId: string; // Original payment transaction ID
  amount: number; // Amount to refund in MWK
  reason?: string; // Optional refund reason
  orderId?: string; // Optional order reference
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  transactionId?: string;
  amount?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  error?: string;
}

/**
 * Process refund through PayChangu
 *
 * IMPORTANT: This function needs PayChangu refund API documentation
 * Contact: developer@paychangu.com or support@paychangu.com
 *
 * Expected API pattern (based on common payment gateway standards):
 * POST {PAYCHANGU_BASE_URL}/refund or /transactions/{tx_ref}/refund
 * Headers: Authorization: Bearer {API_SECRET}
 * Body: { tx_ref, amount, currency, reason }
 */
export const processPayChanguRefund = async (
  request: RefundRequest
): Promise<RefundResponse> => {
  try {
    const apiSecret = process.env.PAYCHANGU_API_SECRET;
    const baseUrl = process.env.PAYCHANGU_BASE_URL || 'https://api.paychangu.com';

    if (!apiSecret) {
      return {
        success: false,
        message: 'PayChangu API credentials not configured',
        error: 'Missing PAYCHANGU_API_SECRET',
      };
    }

    // Validate transaction ID exists in our database
    const payment = await Payment.findOne({ transactionId: request.transactionId });
    if (!payment) {
      return {
        success: false,
        message: 'Original payment transaction not found',
        error: 'Invalid transaction ID',
      };
    }

    if (payment.status !== 'completed') {
      return {
        success: false,
        message: 'Cannot refund a payment that is not completed',
        error: `Payment status is ${payment.status}`,
      };
    }

    // Validate refund amount
    if (request.amount > payment.amount) {
      return {
        success: false,
        message: 'Refund amount cannot exceed original payment amount',
        error: `Refund amount (${request.amount}) > Original amount (${payment.amount})`,
      };
    }

    console.log('Processing PayChangu refund:', {
      transactionId: request.transactionId,
      amount: request.amount,
      originalAmount: payment.amount,
    });

    // TODO: Get actual PayChangu refund API endpoint and payload structure
    // Possible endpoints (common patterns):
    // - POST /refund
    // - POST /transactions/{tx_ref}/refund
    // - POST /payments/{payment_id}/refund

    const refundData = {
      tx_ref: request.transactionId, // or transaction_id, payment_id
      amount: Math.round(request.amount), // PayChangu expects integer amounts
      currency: 'MWK',
      reason: request.reason || 'Customer refund request',
      // Possible additional fields:
      // order_id: request.orderId,
      // refund_type: 'full' or 'partial',
      // callback_url: for async refunds,
    };

    // Uncomment and update when you get the actual API endpoint from PayChangu
    /*
    const response = await fetch(`${baseUrl}/refund`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiSecret}`,
      },
      body: JSON.stringify(refundData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayChangu Refund Error:', data);
      return {
        success: false,
        message: data.message || 'Refund failed',
        error: `HTTP ${response.status}`,
      };
    }

    // Expected response format (adjust based on actual PayChangu response):
    if (data.status === 'success') {
      return {
        success: true,
        refundId: data.data?.refund_id || data.refund_id,
        transactionId: request.transactionId,
        amount: request.amount,
        status: data.data?.status || 'completed',
        message: data.message || 'Refund processed successfully',
      };
    }

    return {
      success: false,
      message: data.message || 'Refund request failed',
      error: data.error,
    };
    */

    // Temporary: Return success for testing until PayChangu API is integrated
    console.warn('⚠️  PayChangu refund API not yet integrated - simulating success');
    return {
      success: true,
      refundId: `REFUND_${Date.now()}`,
      transactionId: request.transactionId,
      amount: request.amount,
      status: 'completed',
      message: 'Refund processed successfully (simulated - integrate PayChangu API)',
    };
  } catch (error: any) {
    console.error('Error processing PayChangu refund:', error);
    return {
      success: false,
      message: error.message || 'Failed to process refund',
      error: error.message,
    };
  }
};

/**
 * Check refund status (if PayChangu provides refund tracking)
 * GET {PAYCHANGU_BASE_URL}/refunds/{refund_id}
 */
export const checkRefundStatus = async (
  refundId: string
): Promise<RefundResponse> => {
  try {
    const apiSecret = process.env.PAYCHANGU_API_SECRET;
    const baseUrl = process.env.PAYCHANGU_BASE_URL || 'https://api.paychangu.com';

    if (!apiSecret) {
      return {
        success: false,
        message: 'PayChangu API credentials not configured',
      };
    }

    // TODO: Implement when PayChangu provides refund status endpoint
    console.log('Checking PayChangu refund status:', refundId);

    return {
      success: true,
      refundId,
      status: 'completed',
      message: 'Refund status check not yet implemented',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to check refund status',
      error: error.message,
    };
  }
};
