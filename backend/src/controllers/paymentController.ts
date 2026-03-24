import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import Order from '../models/Order';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import { PaymentMethod, PaymentStatus } from '../types/shared';
import { initiatePayment } from '../utils/paymentGateways';
import { log } from '../utils/logger';

export const initiatePaymentRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId, towingServiceId, carServiceId, paymentMethod, phoneNumber, returnUrl, cancelUrl } = req.body;

    if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
      res.status(400).json({ message: 'Valid payment method is required' });
      return;
    }

    let entity: any;
    let type: 'order' | 'towing' | 'car-service';
    let amount = 0;
    let entityId: string;

    // Determine which entity is being paid for
    if (orderId) {
      entity = await Order.findOne({ _id: orderId, user: req.user!._id });
      if (!entity) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }
      type = 'order';
      amount = entity.totalAmount;
      entityId = orderId;
    } else if (towingServiceId) {
      entity = await TowingService.findOne({
        _id: towingServiceId,
        user: req.user!._id,
      });
      if (!entity) {
        res.status(404).json({ message: 'Towing service not found' });
        return;
      }
      type = 'towing';
      amount = entity.price || 0;
      entityId = towingServiceId;
    } else if (carServiceId) {
      entity = await CarService.findOne({
        _id: carServiceId,
        user: req.user!._id,
      });
      if (!entity) {
        res.status(404).json({ message: 'Car service not found' });
        return;
      }
      type = 'car-service';
      amount = entity.price || 0;
      entityId = carServiceId;
    } else {
      res.status(400).json({
        message: 'Either orderId, towingServiceId, or carServiceId is required',
      });
      return;
    }

    if (amount === 0) {
      res.status(400).json({ message: 'Amount must be greater than 0' });
      return;
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      [type === 'order' ? 'order' : type === 'towing' ? 'towingService' : 'carService']:
        entityId,
      status: PaymentStatus.PENDING,
    });

    if (existingPayment) {
      res.status(400).json({ message: 'Payment already initiated' });
      return;
    }

    // Initiate payment with gateway
    const reference = `${type.toUpperCase()}_${entityId}_${Date.now()}`;

    // For PayChangu, construct return and cancel URLs if not provided
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const finalReturnUrl = returnUrl || `${baseUrl}/payment/success?paymentId={PAYMENT_ID}`;
    const finalCancelUrl = cancelUrl || `${baseUrl}/payment/cancel?paymentId={PAYMENT_ID}`;

    // Prepare customer information for PayChangu
    const customerInfo = paymentMethod === PaymentMethod.PAYCHANGU ? {
      email: req.user?.email || entity.user?.email || entity.email,
      firstName: req.user?.name?.split(' ')[0] || entity.user?.name?.split(' ')[0] || entity.name?.split(' ')[0] || 'Customer',
      lastName: req.user?.name?.split(' ').slice(1).join(' ') || entity.user?.name?.split(' ').slice(1).join(' ') || entity.name?.split(' ').slice(1).join(' ') || '',
    } : undefined;

    const paymentResponse = await initiatePayment(
      paymentMethod,
      {
        amount,
        phoneNumber: phoneNumber || req.user!.phone,
        reference,
        description: `Payment for ${type}`,
      },
      paymentMethod === PaymentMethod.PAYCHANGU ? finalReturnUrl : undefined,
      paymentMethod === PaymentMethod.PAYCHANGU ? finalCancelUrl : undefined,
      customerInfo
    );

    if (!paymentResponse.success) {
      res.status(400).json({ message: paymentResponse.message });
      return;
    }

    // Create payment record
    const paymentData: any = {
      type,
      amount,
      method: paymentMethod,
      transactionId: paymentResponse.transactionId,
      status: PaymentStatus.PENDING,
    };

    if (type === 'order') paymentData.order = entityId;
    if (type === 'towing') paymentData.towingService = entityId;
    if (type === 'car-service') paymentData.carService = entityId;

    const payment = new Payment(paymentData);
    await payment.save();

    res.status(201).json({
      payment,
      paymentInstructions: paymentResponse.paymentInstructions,
      transactionId: paymentResponse.transactionId,
      redirectUrl: paymentResponse.redirectUrl, // For PayChangu Standard Checkout
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to initiate payment' });
  }
};

export const getPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order')
      .populate('towingService')
      .populate('carService');

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Check if user has access to this payment
    let hasAccess = false;
    if (payment.type === 'order' && payment.order) {
      hasAccess = (payment.order as any).user.toString() === req.user!._id.toString();
    } else if (payment.type === 'towing' && payment.towingService) {
      hasAccess =
        (payment.towingService as any).user.toString() === req.user!._id.toString();
    } else if (payment.type === 'car-service' && payment.carService) {
      hasAccess =
        (payment.carService as any).user.toString() === req.user!._id.toString();
    }

    if (!hasAccess && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch payment' });
  }
};

export const getPaymentByOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ order: orderId, type: 'order' })
      .populate('order')
      .sort({ createdAt: -1 }); // Get the most recent payment

    if (!payment) {
      res.status(404).json({ message: 'Payment not found for this order' });
      return;
    }

    // Check if user has access to this payment
    if (payment.order && (payment.order as any).user.toString() !== req.user!._id.toString()) {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
    }

    res.json({ payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch payment' });
  }
};


export const payChanguWebhook = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // PayChangu webhook handler
    // PayChangu will send webhook with payment status updates
    const { sessionId, status, transactionId, reference, amount, charge_id, chargeId } = req.body as {
      sessionId?: string;
      status?: string;
      transactionId?: string;
      reference?: string;
      amount?: number;
      charge_id?: string; // PayChangu's charge ID (snake_case)
      chargeId?: string; // PayChangu's charge ID (camelCase) - check both formats
    };

    // Verify webhook signature for security
    const webhookSecret = process.env.PAYCHANGU_WEBHOOK_SECRET;

    if (webhookSecret) {
      // PayChangu signature verification (HMAC-SHA256)
      // PayChangu sends signature in "Signature" header (lowercase in Express)
      // Docs: https://developer.paychangu.com/docs/webhooks
      const signature = req.headers['signature'] ||
                       req.headers['x-paychangu-signature'] ||
                       req.headers['x-signature'];

      if (signature) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== expectedSignature) {
          const sigStr = Array.isArray(signature) ? signature[0] : signature;
          log.error('PayChangu webhook: Invalid signature', {
            receivedSignature: sigStr.substring(0, 10) + '...',
            sessionId,
            reference
          });
          res.status(401).json({ message: 'Invalid webhook signature' });
          return;
        }
        log.payment.webhook('PayChangu', 'Signature verified', { sessionId, reference });
      } else {
        // If webhook secret is configured but no signature received
        log.warn('PayChangu webhook: No signature provided but PAYCHANGU_WEBHOOK_SECRET is set');
        // In development, allow webhooks without signatures for testing
        // In production, reject unsigned webhooks
        if (process.env.NODE_ENV === 'production') {
          res.status(401).json({ message: 'Webhook signature required in production' });
          return;
        }
      }
    } else {
      // Webhook secret not configured - log warning
      log.warn('PayChangu webhook: PAYCHANGU_WEBHOOK_SECRET not configured. Webhook verification disabled.');
      // TODO: Contact PayChangu support at support@paychangu.com to get webhook secret
    }

    // Find payment by transactionId or sessionId
    // Build query conditions - only use $regex if reference is defined
    const queryConditions: any[] = [
      { transactionId: transactionId || sessionId },
    ];

    if (reference && typeof reference === 'string') {
      queryConditions.push({ transactionId: { $regex: reference } });
    }

    const payment = await Payment.findOne({
      $or: queryConditions,
    });

    if (!payment) {
      log.warn('PayChangu webhook: Payment not found', { sessionId, transactionId, reference });
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Update payment status based on PayChangu response
    if (status === 'success' || status === 'completed' || status === 'paid') {
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = transactionId || payment.transactionId;
      // Store PayChangu's charge_id for refund purposes
      payment.chargeId = charge_id || chargeId || payment.chargeId;

      // Update related entity payment status
      if (payment.type === 'order' && payment.order) {
        const order = await Order.findById(payment.order);
        if (order) {
          order.paymentStatus = PaymentStatus.COMPLETED;
          await order.save();
        }
      } else if (payment.type === 'towing' && payment.towingService) {
        const towingService = await TowingService.findById(payment.towingService);
        if (towingService) {
          towingService.paymentStatus = 'completed';
          await towingService.save();
        }
      } else if (payment.type === 'car-service' && payment.carService) {
        const carService = await CarService.findById(payment.carService);
        if (carService) {
          carService.paymentStatus = 'completed';
          await carService.save();
        }
      }
    } else if (status === 'failed' || status === 'cancelled') {
      payment.status = PaymentStatus.FAILED;
    }

    await payment.save();

    log.payment.webhook('PayChangu', 'Payment updated', {
      paymentId: payment._id,
      status: payment.status,
      type: payment.type
    });

    res.json({ success: true, payment });
  } catch (error: any) {
    log.error('PayChangu webhook error', error);
    res.status(500).json({ message: error.message || 'Failed to process PayChangu webhook' });
  }
};

export const verifyPaymentByTxRef = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify payment using transaction reference (for PayChangu callback)
    const { tx_ref, orderId } = req.query as { tx_ref?: string; orderId?: string };

    if (!tx_ref && !orderId) {
      res.status(400).json({ message: 'Transaction reference or order ID is required' });
      return;
    }

    // Find payment by transaction reference or order ID
    let payment;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        payment = await Payment.findOne({ order: order._id });
      }
    } else if (tx_ref) {
      payment = await Payment.findOne({
        $or: [
          { transactionId: tx_ref },
          { transactionId: { $regex: String(tx_ref).split('_')[0] } }
        ]
      });
    }

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Verify payment with PayChangu API to get charge_id
    const apiSecret = process.env.PAYCHANGU_API_SECRET;
    const baseUrl = process.env.PAYCHANGU_BASE_URL || 'https://api.paychangu.com';

    if (apiSecret && payment.transactionId) {
      try {
        const verifyResponse = await fetch(`${baseUrl}/verify-payment/${payment.transactionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiSecret}`,
            'Accept': 'application/json',
          },
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json() as any;
          // Extract charge_id from PayChangu response
          if (verifyData.data?.charge_id) {
            payment.chargeId = verifyData.data.charge_id;
          } else if (verifyData.data?.reference) {
            // reference might be the charge_id
            payment.chargeId = verifyData.data.reference;
          }
        }
      } catch (error) {
        log.error('Error verifying payment with PayChangu', error);
        // Continue anyway - we'll update charge_id from webhook later
      }
    }

    // Update payment status to completed (user reached success page from PayChangu)
    payment.status = PaymentStatus.COMPLETED;

    // Update related entity
    if (payment.type === 'order' && payment.order) {
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = PaymentStatus.COMPLETED;
        await order.save();
      }
    } else if (payment.type === 'towing' && payment.towingService) {
      const towingService = await TowingService.findById(payment.towingService);
      if (towingService) {
        towingService.paymentStatus = 'completed';
        await towingService.save();
      }
    } else if (payment.type === 'car-service' && payment.carService) {
      const carService = await CarService.findById(payment.carService);
      if (carService) {
        carService.paymentStatus = 'completed';
        await carService.save();
      }
    }

    await payment.save();
    res.json({ verified: true, payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to verify payment' });
  }
};

