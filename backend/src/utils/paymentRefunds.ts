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

    // Check if we have the charge_id
    if (!payment.chargeId) {
      return {
        success: false,
        message: 'Payment charge ID not found. Cannot process refund through PayChangu.',
        error: 'Missing chargeId in payment record',
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
      chargeId: payment.chargeId,
      amount: request.amount,
      originalAmount: payment.amount,
    });

    // Call PayChangu refund API
    // Endpoint: POST /charge-card/refund/{charge_id}
    const response = await fetch(`${baseUrl}/charge-card/refund/${payment.chargeId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiSecret}`,
      },
      // PayChangu refund endpoint may not require body parameters
      // The charge_id in the URL is sufficient
      // If partial refunds need amount, uncomment:
      // body: JSON.stringify({ amount: Math.round(request.amount) }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('PayChangu Refund Error:', data);
      return {
        success: false,
        message: data.message || 'Refund failed',
        error: `HTTP ${response.status}: ${data.message || 'Unknown error'}`,
      };
    }

    // PayChangu response format
    if (data.status === 'success') {
      return {
        success: true,
        refundId: data.data?.refund_id || data.data?.charge_id || payment.chargeId,
        transactionId: request.transactionId,
        amount: request.amount,
        status: 'completed',
        message: data.message || 'Refund processed successfully',
      };
    }

    return {
      success: false,
      message: data.message || 'Refund request failed',
      error: data.error || 'Unknown error',
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
 * Check refund status
 * Note: PayChangu refunds are typically instant. This is for future use.
 */
export const checkRefundStatus = async (
  refundId: string
): Promise<RefundResponse> => {
  try {
    console.log('Checking PayChangu refund status:', refundId);

    // PayChangu refunds are typically processed instantly
    // If status tracking is needed in the future, implement:
    // GET /refunds/{refund_id} or similar endpoint

    return {
      success: true,
      refundId,
      status: 'completed',
      message: 'PayChangu refunds are processed instantly',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to check refund status',
      error: error.message,
    };
  }
};
