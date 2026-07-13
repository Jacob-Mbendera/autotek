import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import Order from '../models/Order';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import User from '../models/User';
import { PaymentMethod, PaymentStatus, UserRole } from '../types/shared';
import { initiatePayment } from '../utils/paymentGateways';
import { log } from '../utils/logger';
import { createPayoutAfterPaymentSave } from '../utils/servicePayout';
import { emailService } from '../services/emailService';
import { recordCouponUsageForPaidOrder } from '../utils/couponUsage';

const normalizeRedirectUrl = (url: string | undefined, fallbackUrl: string): string => {
  const candidateUrl = (url || fallbackUrl).trim();

  try {
    const parsedUrl = new URL(candidateUrl);

    // In local development, force localhost redirects to include Vite's default port.
    if (process.env.NODE_ENV !== 'production' && parsedUrl.hostname === 'localhost') {
      if (!parsedUrl.port) {
        parsedUrl.port = '5173';
      }
    }

    return parsedUrl.toString();
  } catch {
    return fallbackUrl;
  }
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Resolve payment from PayChangu tx_ref without broad regex (e.g. matching only "TOWING"),
 * which could mark the wrong payment complete and leave the customer's service unpaid.
 */
async function findPaymentByTxRef(txRefRaw: string) {
  const trimmed = String(txRefRaw).trim();
  if (!trimmed) {
    return null;
  }

  let payment = await Payment.findOne({ transactionId: trimmed });
  if (payment) {
    return payment;
  }

  payment = await Payment.findOne({
    transactionId: new RegExp(`^${escapeRegex(trimmed)}$`, 'i'),
  });
  if (payment) {
    return payment;
  }

  const oidMatch = trimmed.match(/([a-f0-9]{24})/i);
  if (!oidMatch) {
    return null;
  }

  const entityId = oidMatch[1];

  payment = await Payment.findOne({
    $or: [{ order: entityId }, { towingService: entityId }, { carService: entityId }],
    status: PaymentStatus.PENDING,
  }).sort({ createdAt: -1 });

  if (payment) {
    return payment;
  }

  return Payment.findOne({
    $or: [{ order: entityId }, { towingService: entityId }, { carService: entityId }],
    status: PaymentStatus.COMPLETED,
  }).sort({ createdAt: -1 });
}

async function findPaymentForWebhook(params: {
  transactionId?: string;
  sessionId?: string;
  reference?: string;
}) {
  const candidates = [params.transactionId, params.sessionId, params.reference]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const direct = await Payment.findOne({ transactionId: candidate });
    if (direct) {
      return direct;
    }
  }

  for (const candidate of candidates) {
    const exactInsensitive = await Payment.findOne({
      transactionId: new RegExp(`^${escapeRegex(candidate)}$`, 'i'),
    });
    if (exactInsensitive) {
      return exactInsensitive;
    }
  }

  for (const candidate of candidates) {
    const byTxRef = await findPaymentByTxRef(candidate);
    if (byTxRef) {
      return byTxRef;
    }
  }

  return null;
}

/** Keep order / service paymentStatus in sync when payment is already completed (idempotent). */
async function syncCompletedPaymentToRelatedEntities(payment: {
  _id: unknown;
  type: string;
  order?: unknown;
  towingService?: unknown;
  carService?: unknown;
  amount?: number;
  method?: string;
  transactionId?: string;
}): Promise<void> {
  if (payment.type === 'order' && payment.order) {
    const order = await Order.findOneAndUpdate(
      { _id: payment.order, paymentStatus: { $ne: PaymentStatus.COMPLETED } },
      { paymentStatus: PaymentStatus.COMPLETED },
      { new: true }
    );

    if (!order) {
      return;
    }

    try {
      await recordCouponUsageForPaidOrder(order);
    } catch (couponError) {
      log.error('Failed to record coupon usage after payment', {
        orderId: String(order._id),
        couponCode: order.couponCode,
        error: couponError,
      });
    }

    try {
      const paymentDetails = {
        amount: payment.amount ?? order.totalAmount,
        method: payment.method ?? PaymentMethod.PAYCHANGU,
        transactionId: payment.transactionId,
      };

      if (order.user) {
        const user = await User.findById(order.user);
        if (user) {
          await emailService.sendPaymentConfirmation(order, paymentDetails, user);
        }
      } else if (order.guestInfo?.email) {
        await emailService.sendPaymentConfirmation(
          order,
          paymentDetails,
          undefined,
          order.guestInfo.email
        );
      }
    } catch (emailError) {
      log.error('Failed to send payment confirmation email', emailError);
    }
  } else if (payment.type === 'towing' && payment.towingService) {
    const towingService = await TowingService.findById(payment.towingService);
    if (towingService && towingService.paymentStatus !== 'completed') {
      towingService.paymentStatus = 'completed';
      if (!towingService.payment) {
        towingService.payment = payment._id as any;
      }
      await towingService.save();
    }
  } else if (payment.type === 'car-service' && payment.carService) {
    const carService = await CarService.findById(payment.carService);
    if (carService && carService.paymentStatus !== 'completed') {
      carService.paymentStatus = 'completed';
      if (!carService.payment) {
        carService.payment = payment._id as any;
      }
      await carService.save();
    }
  }
}

export const initiatePaymentRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role === UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin accounts cannot initiate customer payments' });
      return;
    }

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
      // Support both authenticated users and guest orders
      if (req.user) {
        // Authenticated user - find order by user ID
        entity = await Order.findOne({ _id: orderId, user: req.user._id });
      } else {
        // Guest user - find order by ID (guest orders have no user field or guestInfo)
        entity = await Order.findById(orderId);
        // Verify it's actually a guest order (has guestInfo, not user)
        if (entity && entity.user) {
          entity = null; // Don't allow guests to pay for authenticated user orders
        }
      }

      if (!entity) {
        res.status(404).json({ message: 'Order not found or unauthorized' });
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
      const message =
        type === 'towing' || type === 'car-service'
          ? 'Price not set yet. Online payment in Malawi Kwacha (MWK) is available after your quote is confirmed.'
          : 'Amount must be greater than 0';
      res.status(400).json({ message });
      return;
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      [type === 'order' ? 'order' : type === 'towing' ? 'towingService' : 'carService']:
        entityId,
      status: PaymentStatus.PENDING,
    });

    // Fresh tx_ref for each PayChangu session (abandoned checkouts get a new session below)
    const reference = `${type.toUpperCase()}_${entityId}_${Date.now()}`;

    // For PayChangu, construct return and cancel URLs if not provided
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const finalReturnUrl = normalizeRedirectUrl(
      returnUrl,
      `${baseUrl}/payment/success?paymentId={PAYMENT_ID}`
    );
    const finalCancelUrl = normalizeRedirectUrl(
      cancelUrl,
      `${baseUrl}/payment/cancel?paymentId={PAYMENT_ID}`
    );
    log.info('PayChangu redirect URLs prepared', {
      type,
      entityId,
      successRedirectUrl: finalReturnUrl,
      cancelRedirectUrl: finalCancelUrl,
      requestReturnUrl: returnUrl,
      requestCancelUrl: cancelUrl,
    });

    // Prepare customer information for PayChangu
    // Support both authenticated users and guest orders
    const guestInfo = entity.guestInfo;
    const userEmail = req.user?.email || guestInfo?.email || entity.user?.email || entity.email;
    const userName = req.user?.name || guestInfo?.name || entity.user?.name || entity.name || 'Customer';
    const userPhone = phoneNumber || req.user?.phone || guestInfo?.phone;

    const customerInfo = paymentMethod === PaymentMethod.PAYCHANGU ? {
      email: userEmail,
      firstName: userName.split(' ')[0] || 'Customer',
      lastName: userName.split(' ').slice(1).join(' ') || '',
    } : undefined;

    if (!userPhone) {
      res.status(400).json({ message: 'Phone number is required for payment' });
      return;
    }

    const paymentResponse = await initiatePayment(
      paymentMethod,
      {
        amount,
        phoneNumber: userPhone,
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

    let payment: InstanceType<typeof Payment>;

    if (existingPayment) {
      // User returned without paying — reuse the same Payment row with a new PayChangu session
      existingPayment.amount = amount;
      existingPayment.method = paymentMethod;
      existingPayment.transactionId = paymentResponse.transactionId;
      existingPayment.set('chargeId', undefined);
      await existingPayment.save();
      payment = existingPayment;
      log.info('Payment checkout re-initiated (pending session replaced)', {
        paymentId: payment._id,
        type,
        entityId,
      });
    } else {
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

      payment = new Payment(paymentData);
      await payment.save();

      if (type === 'towing' && entity) {
        entity.payment = payment._id;
        await entity.save();
      } else if (type === 'car-service' && entity) {
        entity.payment = payment._id;
        await entity.save();
      }
    }

    res.status(201).json({
      payment,
      paymentInstructions: paymentResponse.paymentInstructions,
      transactionId: paymentResponse.transactionId,
      redirectUrl: paymentResponse.redirectUrl,
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

export const getPaymentByTowingService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;

    const payment = await Payment.findOne({ towingService: serviceId, type: 'towing' })
      .populate('towingService')
      .sort({ createdAt: -1 }); // Get the most recent payment

    if (!payment) {
      res.status(404).json({ message: 'Payment not found for this service' });
      return;
    }

    // Check if user has access to this payment
    if (payment.towingService && (payment.towingService as any).user.toString() !== req.user!._id.toString()) {
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

export const getPaymentByCarService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;

    const payment = await Payment.findOne({ carService: serviceId, type: 'car-service' })
      .populate('carService')
      .sort({ createdAt: -1 }); // Get the most recent payment

    if (!payment) {
      res.status(404).json({ message: 'Payment not found for this service' });
      return;
    }

    // Check if user has access to this payment
    if (payment.carService && (payment.carService as any).user.toString() !== req.user!._id.toString()) {
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

    if (process.env.NODE_ENV === 'production' && !webhookSecret) {
      log.error('PayChangu webhook blocked: PAYCHANGU_WEBHOOK_SECRET not configured in production.');
      res.status(500).json({ message: 'Webhook signature configuration missing' });
      return;
    }

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

    const payment = await findPaymentForWebhook({
      transactionId,
      sessionId,
      reference: typeof reference === 'string' ? reference : undefined,
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

      await syncCompletedPaymentToRelatedEntities(payment);
    } else if (status === 'failed' || status === 'cancelled') {
      payment.status = PaymentStatus.FAILED;
    }

    await payment.save();

    if (payment.status === PaymentStatus.COMPLETED && (payment.type === 'towing' || payment.type === 'car-service')) {
      await createPayoutAfterPaymentSave(payment._id.toString());
    }

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

/** PayChangu GET /verify-payment/{tx_ref} — only treat as paid when gateway reports success (see PayChangu docs). */
function isPaychanguVerifySuccess(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const body = payload as Record<string, unknown>;
  if (String(body.status || '').toLowerCase() !== 'success') {
    return false;
  }
  const data = body.data;
  if (!data || typeof data !== 'object') {
    return false;
  }
  const d = data as Record<string, unknown>;
  const s = String(d.status || '').toLowerCase();
  return s === 'success' || s === 'successful';
}

export const verifyPaymentByTxRef = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify payment using transaction reference (for PayChangu callback)
    const { tx_ref, orderId, towingServiceId, carServiceId } = req.query as {
      tx_ref?: string;
      orderId?: string;
      towingServiceId?: string;
      carServiceId?: string;
    };

    if (!tx_ref && !orderId && !towingServiceId && !carServiceId) {
      res.status(400).json({
        message: 'Transaction reference, order ID, towingServiceId, or carServiceId is required',
      });
      return;
    }

    // Find payment by order, towing/car service, or tx_ref (product vs service PayChangu return)
    let payment;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        payment = await Payment.findOne({ order: order._id, type: 'order' }).sort({ createdAt: -1 });
      }
    } else if (towingServiceId) {
      payment = await Payment.findOne({ towingService: towingServiceId, type: 'towing' }).sort({
        createdAt: -1,
      });
    } else if (carServiceId) {
      payment = await Payment.findOne({ carService: carServiceId, type: 'car-service' }).sort({
        createdAt: -1,
      });
    } else if (tx_ref) {
      payment = await findPaymentByTxRef(tx_ref);
    }

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    if (tx_ref && payment.transactionId) {
      const normalizedIncoming = String(tx_ref).trim();
      const normalizedStored = String(payment.transactionId).trim();
      if (normalizedIncoming !== normalizedStored) {
        res.status(400).json({ message: 'Transaction reference does not match this payment' });
        return;
      }
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      await syncCompletedPaymentToRelatedEntities(payment);
      res.json({ verified: true, payment });
      return;
    }

    const apiSecret = process.env.PAYCHANGU_API_SECRET;
    const baseUrl = process.env.PAYCHANGU_BASE_URL || 'https://api.paychangu.com';

    if (!apiSecret || !payment.transactionId) {
      log.warn('verifyPaymentByTxRef: missing PAYCHANGU_API_SECRET or payment.transactionId; cannot verify with PayChangu');
      res.json({
        verified: false,
        payment,
        message: 'Payment is still pending gateway verification',
      });
      return;
    }

    let verifyData: unknown;
    try {
      const verifyResponse = await fetch(`${baseUrl}/verify-payment/${encodeURIComponent(payment.transactionId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiSecret}`,
          Accept: 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        log.info('PayChangu verify-payment non-OK response', {
          status: verifyResponse.status,
          tx: payment.transactionId,
        });
        res.json({ verified: false, payment, message: 'Gateway verification did not confirm payment yet' });
        return;
      }

      verifyData = await verifyResponse.json();
    } catch (error) {
      log.error('Error verifying payment with PayChangu', error);
      res.json({ verified: false, payment, message: 'Gateway verification failed' });
      return;
    }

    if (!isPaychanguVerifySuccess(verifyData)) {
      res.json({ verified: false, payment, message: 'Payment not successful at gateway' });
      return;
    }

    const vd = verifyData as Record<string, unknown>;
    const dataObj = vd.data as Record<string, unknown> | undefined;
    if (dataObj?.charge_id) {
      payment.chargeId = String(dataObj.charge_id);
    } else if (dataObj?.reference) {
      payment.chargeId = String(dataObj.reference);
    }

    payment.status = PaymentStatus.COMPLETED;
    await syncCompletedPaymentToRelatedEntities(payment);
    await payment.save();

    if (payment.type === 'towing' || payment.type === 'car-service') {
      await createPayoutAfterPaymentSave(payment._id.toString());
    }

    res.json({ verified: true, payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to verify payment' });
  }
};

