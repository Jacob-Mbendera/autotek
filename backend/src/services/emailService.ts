import nodemailer from 'nodemailer';
import { IOrder, IShippingAddress } from '../models/Order';
import User, { IUser } from '../models/User';
import { sendPasswordResetEmail } from '../utils/email';
import { ServiceStatus } from '../types/shared';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPickupLocation(address: IShippingAddress | string): string {
  if (typeof address === 'string') {
    return address;
  }
  if (address.customAddress) {
    return address.town ? `${address.town} - ${address.customAddress}` : address.customAddress;
  }
  if (address.legacyAddress) {
    return address.legacyAddress;
  }
  if (address.town && address.landmark) {
    return `${address.town}, ${address.landmark}`;
  }
  if (address.landmark) {
    return address.landmark;
  }
  if (address.town) {
    return address.town;
  }
  return 'your pickup location';
}

type ServiceStatusEmailTrigger = 'assigned' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';

interface ServiceStatusUpdateParams {
  kind: 'towing' | 'car-service';
  service: Record<string, unknown>;
  user: IUser;
  previousStatus: ServiceStatus;
  previousEstimatedArrivalAt?: Date;
}

function assigneeDisplay(service: Record<string, unknown>): { name: string; garage?: string } | null {
  const assignee = (service.assignedDriver || service.assignedMechanic) as
    | { name?: string; garage?: { name?: string } | string }
    | undefined;
  if (!assignee || typeof assignee !== 'object' || !assignee.name) {
    return null;
  }
  const garage =
    typeof assignee.garage === 'object' && assignee.garage && 'name' in assignee.garage
      ? String(assignee.garage.name || '')
      : undefined;
  return { name: assignee.name, garage: garage || undefined };
}

function determineServiceEmailTrigger(
  previousStatus: ServiceStatus,
  newStatus: ServiceStatus,
  previousEta: Date | undefined,
  newEta: Date | undefined
): ServiceStatusEmailTrigger | null {
  if (newStatus === ServiceStatus.CANCELLED && previousStatus !== ServiceStatus.CANCELLED) {
    return 'cancelled';
  }
  if (newStatus === ServiceStatus.COMPLETED && previousStatus !== ServiceStatus.COMPLETED) {
    return 'completed';
  }
  if (newStatus === ServiceStatus.IN_PROGRESS && previousStatus !== ServiceStatus.IN_PROGRESS) {
    return 'in_progress';
  }

  const etaChanged = (previousEta?.getTime() ?? null) !== (newEta?.getTime() ?? null);
  if (newStatus === ServiceStatus.ASSIGNED && etaChanged && newEta) {
    return 'on_the_way';
  }
  if (newStatus === ServiceStatus.ASSIGNED && previousStatus !== ServiceStatus.ASSIGNED) {
    return 'assigned';
  }

  return null;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize transporter if email credentials are provided
    // Supports multiple email service configurations:
    // 1. SendGrid: EMAIL_HOST=smtp.sendgrid.net, EMAIL_USER=apikey, EMAIL_PASS=<api_key>
    // 2. Gmail: EMAIL_HOST=smtp.gmail.com, EMAIL_USER=<email>, EMAIL_PASS=<app_password>
    // 3. Custom SMTP: Any SMTP server credentials

    if (
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
    ) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        // Every call site awaits this inline in the request path (registration, checkout,
        // order/service status updates, refunds...). Without these, a slow or unreachable
        // SMTP server hangs the underlying HTTP request for minutes instead of failing fast
        // into the try/catch each call site already has.
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      console.log(`Email service initialized: ${process.env.EMAIL_HOST}`);
    } else {
      // Warn in production if email not configured
      if (process.env.NODE_ENV === 'production') {
        console.error('WARNING: Email service not configured in production!');
        console.error('Please set EMAIL_HOST, EMAIL_USER, EMAIL_PASS environment variables');
      } else {
        console.log('INFO: Email service not configured - emails will be logged to console');
      }
    }
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    const emailFrom = process.env.EMAIL_FROM || 'AutoTek <noreply@autotek.mw>';

    // If no transporter configured, log in development or error in production
    if (!this.transporter) {
      if (process.env.NODE_ENV === 'development') {
        console.log('\n=== EMAIL (Not Sent - Dev Mode) ===');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('HTML Preview:', options.html.substring(0, 200) + '...');
        console.log('===================================\n');
        return;
      } else {
        console.error('ERROR: Attempted to send email but no transporter configured!');
        console.error('Email details:', { to: options.to, subject: options.subject });
        // In production, we should log this but not crash
        return;
      }
    }

    try {
      await this.transporter.sendMail({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      console.log(`Email sent successfully to ${options.to}: ${options.subject}`);
    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Email details:', { to: options.to, subject: options.subject });
      // Don't throw - email failures shouldn't break the app
      // But in production, you might want to log this to an error tracking service
    }
  }

  async sendOrderConfirmation(order: IOrder, user?: IUser, guestEmail?: string): Promise<void> {
    const email = user?.email || guestEmail || '';
    if (!email) return;

    const userName = user?.name || order.guestInfo?.name || 'Customer';
    const orderId = order._id.toString().slice(-8).toUpperCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trackOrderUrl = user
      ? `${frontendUrl}/orders/${order._id}`
      : `${frontendUrl}/orders/${order._id}?email=${encodeURIComponent(email)}`;

    const subject = `Order Confirmation #${orderId} - AutoTek`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Thank You for Your Order!</h2>
          <p>Hello ${userName},</p>
          <p>We've received your order and are processing it. Here are your order details:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Order #${orderId}</h3>
            <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> MWK ${order.totalAmount.toLocaleString()}</p>
            ${order.discount ? `<p style="margin: 5px 0;"><strong>Discount:</strong> MWK ${order.discount.toLocaleString()}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            <p style="margin: 5px 0;"><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackOrderUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Your Order</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Complete your payment to confirm this order. We'll send a separate email once your payment is received.
            If you have any questions, please contact our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendPaymentConfirmation(
    order: IOrder,
    paymentDetails: { amount: number; method: string; transactionId?: string },
    user?: IUser,
    guestEmail?: string
  ): Promise<void> {
    const email = user?.email || guestEmail || order.guestInfo?.email || '';
    if (!email) return;

    const userName = user?.name || order.guestInfo?.name || 'Customer';
    const orderId = order._id.toString().slice(-8).toUpperCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trackOrderUrl = user
      ? `${frontendUrl}/orders/${order._id}`
      : `${frontendUrl}/orders/${order._id}?email=${encodeURIComponent(email)}`;

    const methodLabel = paymentDetails.method
      ? paymentDetails.method.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'PayChangu';

    const referenceLine = paymentDetails.transactionId
      ? `<p style="margin: 5px 0;"><strong>Payment reference:</strong> ${escapeHtml(paymentDetails.transactionId)}</p>`
      : '';

    const subject = `Payment Received – Order #${orderId} - AutoTek`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Payment Confirmed</h2>
          <p>Hello ${escapeHtml(userName)},</p>
          <p>We've received your payment. Your order is confirmed and will be processed shortly.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Order #${orderId}</h3>
            <p style="margin: 5px 0;"><strong>Amount paid:</strong> MWK ${paymentDetails.amount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Payment method:</strong> ${escapeHtml(methodLabel)}</p>
            ${referenceLine}
            <p style="margin: 5px 0;"><strong>Payment status:</strong> Paid</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackOrderUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Your Order</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            We'll email you again when your order ships. If you have any questions, contact our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendOrderStatusUpdate(order: IOrder, user?: IUser, guestEmail?: string): Promise<void> {
    const email = user?.email || guestEmail || '';
    if (!email) return;

    const userName = user?.name || order.guestInfo?.name || 'Customer';
    const orderId = order._id.toString().slice(-8).toUpperCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trackOrderUrl = user
      ? `${frontendUrl}/orders/${order._id}`
      : `${frontendUrl}/orders/${order._id}?email=${encodeURIComponent(email)}`;

    const pickupLocation = formatPickupLocation(order.shippingAddress);

    const statusMessages: Record<string, { subject: string; message: string }> = {
      processing: {
        subject: `Your Order #${orderId} is Being Prepared`,
        message: "We're preparing your order.",
      },
      dispatched: {
        subject: `Your Order #${orderId} is On the Way for Pickup`,
        message: `Your order is on the way to <strong>${escapeHtml(pickupLocation)}</strong> for pickup.`,
      },
      ready_for_collection: {
        subject: `Your Order #${orderId} is Ready for Collection`,
        message: `Your order is <strong>ready for collection</strong> at <strong>${escapeHtml(pickupLocation)}</strong>.`,
      },
      completed: {
        subject: `Your Order #${orderId} Has Been Collected`,
        message: 'Your order has been collected. Thank you for shopping with AutoTek!',
      },
      cancelled: {
        subject: `Your Order #${orderId} Has Been Cancelled`,
        message: 'Your order has been cancelled. If you have any questions, please contact our support team.',
      },
    };

    const statusInfo = statusMessages[order.status] || {
      subject: `Order #${orderId} Status Update`,
      message: `Your order status has been updated to ${order.status}.`,
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Order Status Update</h2>
          <p>Hello ${escapeHtml(userName)},</p>
          <p>${statusInfo.message}</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Order #${orderId}</h3>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${escapeHtml(order.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}</p>
            <p style="margin: 5px 0;"><strong>Pickup location:</strong> ${escapeHtml(pickupLocation)}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> MWK ${order.totalAmount.toLocaleString()}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackOrderUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Order Details</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject: statusInfo.subject, html });
  }

  async sendServiceStatusUpdate(params: ServiceStatusUpdateParams): Promise<void> {
    const { kind, service, user, previousStatus, previousEstimatedArrivalAt } = params;
    const newStatus = service.status as ServiceStatus;
    const newEta = service.estimatedArrivalAt
      ? new Date(String(service.estimatedArrivalAt))
      : undefined;

    const trigger = determineServiceEmailTrigger(
      previousStatus,
      newStatus,
      previousEstimatedArrivalAt,
      newEta && !Number.isNaN(newEta.getTime()) ? newEta : undefined
    );
    if (!trigger) return;

    const serviceRef = String(service._id || '').slice(-6).toUpperCase();
    const serviceLabel = kind === 'towing' ? 'Towing service' : 'Car service';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const myServicesUrl = `${frontendUrl}/my-services`;
    const provider = assigneeDisplay(service);
    const providerLine = provider
      ? `${escapeHtml(provider.name)}${provider.garage ? ` (${escapeHtml(provider.garage)})` : ''}`
      : 'Your provider';
    const etaLine =
      newEta && !Number.isNaN(newEta.getTime())
        ? newEta.toLocaleString('en-MW', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

    const messages: Record<ServiceStatusEmailTrigger, { subject: string; body: string }> = {
      assigned: {
        subject: `${serviceLabel} update — provider assigned (#${serviceRef})`,
        body: `<p>A provider has been assigned to your ${escapeHtml(serviceLabel.toLowerCase())}: <strong>${providerLine}</strong>.</p>
               <p>We will confirm when they are on the way.</p>`,
      },
      on_the_way: {
        subject: `${serviceLabel} update — provider on the way (#${serviceRef})`,
        body: `<p><strong>${providerLine}</strong> is on the way${
          etaLine ? `.</p><p>Estimated arrival: <strong>${escapeHtml(etaLine)}</strong>.` : '.'
        }</p>`,
      },
      in_progress: {
        subject: `${serviceLabel} update — work started (#${serviceRef})`,
        body: `<p>Your provider has started the job.</p>`,
      },
      completed: {
        subject: `${serviceLabel} complete (#${serviceRef})`,
        body: `<p>Your service is complete. Thank you for using AutoTek!</p>`,
      },
      cancelled: {
        subject: `${serviceLabel} cancelled (#${serviceRef})`,
        body: `<p>Your ${escapeHtml(serviceLabel.toLowerCase())} request has been cancelled.</p>
               <p>If you have questions, please contact our support team.</p>`,
      },
    };

    const statusInfo = messages[trigger];
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Service Status Update</h2>
          <p>Hello ${escapeHtml(user.name)},</p>
          ${statusInfo.body}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${myServicesUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View My Services</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: user.email, subject: statusInfo.subject, html });
  }

  async sendServiceConfirmation(service: any, user: IUser): Promise<void> {
    const serviceTypes = Array.isArray(service.serviceTypes) && service.serviceTypes.length > 0
      ? service.serviceTypes
      : service.serviceType
        ? [service.serviceType]
        : [];
    const serviceTypeText = serviceTypes.length > 0 ? serviceTypes.join(', ') : 'N/A';
    const subject = 'Service Booking Confirmation - AutoTek';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Booking Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Service Booking Confirmed</h2>
          <p>Hello ${user.name},</p>
          <p>Your service booking has been confirmed. We'll contact you soon to schedule the service.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Service Details</h3>
            <p style="margin: 5px 0;"><strong>Service Type:</strong> ${serviceTypeText}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${service.status}</p>
            ${service.preferredDate ? `<p style="margin: 5px 0;"><strong>Preferred Date:</strong> ${new Date(service.preferredDate).toLocaleDateString()}</p>` : ''}
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: user.email, subject, html });
  }

  async sendWelcomeEmail(user: IUser): Promise<void> {
    const subject = 'Welcome to AutoTek!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AutoTek</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to AutoTek!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.name},</h2>
          <p>Thank you for joining AutoTek! We're excited to have you as part of our community.</p>
          <p>You can now:</p>
          <ul>
            <li>Browse our wide selection of automotive parts</li>
            <li>Book towing and car services</li>
            <li>Track your orders in real-time</li>
            <li>Save items to your wishlist</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/products" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Start Shopping</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: user.email, subject, html });
  }

  async sendPasswordReset(user: IUser, resetToken: string): Promise<void> {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
  }

  async sendMechanicInviteEmail(email: string, providerName: string, setPasswordUrl: string): Promise<void> {
    const subject = "You've been invited to AutoTek - Set your password";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AutoTek Mechanic Invite</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${escapeHtml(providerName)},</h2>
          <p>An AutoTek admin has set you up with a mechanic account so you can view and update your assigned jobs.</p>
          <p>Set your password to activate your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setPasswordUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Set Your Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${setPasswordUrl}</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            If you weren't expecting this, you can ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendReturnRequestConfirmation(returnDoc: any, user?: IUser, guestEmail?: string): Promise<void> {
    const email = user?.email || guestEmail || '';
    if (!email) return;

    const userName = user?.name || returnDoc.guestInfo?.name || 'Customer';
    const returnId = returnDoc._id.toString().slice(-8).toUpperCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = user
      ? `${frontendUrl}/returns/${returnDoc._id}`
      : `${frontendUrl}/returns/${returnDoc._id}?email=${encodeURIComponent(email)}`;

    const subject = `Return Request Confirmation #${returnId} - AutoTek`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Return Request Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Return Request Received</h2>
          <p>Hello ${userName},</p>
          <p>We've received your return request and will review it shortly. Here are the details:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Return #${returnId}</h3>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}</p>
            <p style="margin: 5px 0;"><strong>Refund Amount:</strong> MWK ${returnDoc.refundAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Refund Method:</strong> ${returnDoc.refundMethod === 'original-payment' ? 'Original Payment Method' : 'Store Credit'}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${returnUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Your Return</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Our team will review your return request and get back to you within 2-3 business days.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendReturnApprovalEmail(returnDoc: any, user?: IUser, guestEmail?: string): Promise<void> {
    const email = user?.email || guestEmail || '';
    if (!email) return;

    const userName = user?.name || returnDoc.guestInfo?.name || 'Customer';
    const returnId = returnDoc._id.toString().slice(-8).toUpperCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = user
      ? `${frontendUrl}/returns/${returnDoc._id}`
      : `${frontendUrl}/returns/${returnDoc._id}?email=${encodeURIComponent(email)}`;

    const subject = `Return Request Approved #${returnId} - AutoTek`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Return Approved</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Return Request Approved</h2>
          <p>Hello ${userName},</p>
          <p>Great news! Your return request has been approved. Please follow the instructions below to complete your return.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Return #${returnId}</h3>
            <p style="margin: 5px 0;"><strong>Shipping Label:</strong> ${returnDoc.shippingLabel || 'Will be provided'}</p>
            <p style="margin: 5px 0;"><strong>Refund Amount:</strong> MWK ${returnDoc.refundAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Refund Method:</strong> ${returnDoc.refundMethod === 'original-payment' ? 'Original Payment Method' : 'Store Credit'}</p>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;"><strong>Next Steps:</strong></p>
            <ol style="margin: 10px 0 0 20px; color: #92400e;">
              <li>Package the items securely</li>
              <li>Attach the shipping label to your package</li>
              <li>Drop off at the nearest shipping location</li>
              <li>Once we receive your return, we'll process your refund</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${returnUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Return Details</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendReturnRejectionEmail(returnDoc: any, user?: IUser, guestEmail?: string): Promise<void> {
    const email = user?.email || guestEmail || '';
    if (!email) return;

    const userName = user?.name || returnDoc.guestInfo?.name || 'Customer';
    const returnId = returnDoc._id.toString().slice(-8).toUpperCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = user
      ? `${frontendUrl}/returns/${returnDoc._id}`
      : `${frontendUrl}/returns/${returnDoc._id}?email=${encodeURIComponent(email)}`;

    const subject = `Return Request Update #${returnId} - AutoTek`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Return Request Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Return Request Update</h2>
          <p>Hello ${userName},</p>
          <p>We've reviewed your return request, and unfortunately, we're unable to approve it at this time.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Return #${returnId}</h3>
            <p style="margin: 5px 0;"><strong>Status:</strong> Rejected</p>
            ${returnDoc.adminNotes ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${returnDoc.adminNotes}</p>` : ''}
          </div>

          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #991b1b;">If you have any questions or concerns about this decision, please contact our support team. We're here to help!</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${returnUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Return Details</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendRefundProcessedEmail(returnDoc: any, user?: IUser, guestEmail?: string): Promise<void> {
    const email = user?.email || guestEmail || '';
    if (!email) return;

    const userName = user?.name || returnDoc.guestInfo?.name || 'Customer';
    const returnId = returnDoc._id.toString().slice(-8).toUpperCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = user
      ? `${frontendUrl}/returns/${returnDoc._id}`
      : `${frontendUrl}/returns/${returnDoc._id}?email=${encodeURIComponent(email)}`;

    const subject = `Refund Processed #${returnId} - AutoTek`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Processed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Refund Processed</h2>
          <p>Hello ${userName},</p>
          <p>Great news! We've processed your refund and it should appear in your account within 5-10 business days.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Return #${returnId}</h3>
            <p style="margin: 5px 0;"><strong>Refund Amount:</strong> MWK ${returnDoc.refundAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Refund Method:</strong> ${returnDoc.refundMethod === 'original-payment' ? 'Original Payment Method' : 'Store Credit'}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Completed</p>
          </div>

          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46;">
              ${returnDoc.refundMethod === 'original-payment'
                ? 'The refund has been processed to your original payment method. Please allow 5-10 business days for the funds to appear in your account.'
                : 'Store credit has been added to your account and is available for immediate use.'}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${returnUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Return Details</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendAdminServiceQuoteRequest(params: {
    kind: 'towing' | 'car-service';
    serviceId: string;
    customerName: string;
    customerEmail: string;
    mobilePhone: string;
    whatsAppPhone: string;
    quoteRequestNotes?: string;
    summaryEntries: { label: string; value: string }[];
  }): Promise<void> {
    const adminEmail =
      process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SUPPORT_EMAIL;
    if (!adminEmail) {
      if (process.env.NODE_ENV === 'production') {
        console.error(
          'ADMIN_NOTIFICATION_EMAIL or SUPPORT_EMAIL not set — admin quote email skipped'
        );
      } else {
        console.log(
          'INFO: ADMIN_NOTIFICATION_EMAIL / SUPPORT_EMAIL not set — quote request logged only'
        );
      }
    }

    const ref = params.serviceId.slice(-6).toUpperCase();
    const subject = `[AutoTek] Quote request — ${params.kind} — #${ref}`;
    const adminUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linesHtml = params.summaryEntries
      .map(
        (e) =>
          `<p style="margin: 4px 0;"><strong>${escapeHtml(e.label)}:</strong> ${escapeHtml(e.value)}</p>`
      )
      .join('');
    const notesBlock = params.quoteRequestNotes
      ? `<p style="margin: 8px 0;"><strong>Customer note:</strong> ${escapeHtml(params.quoteRequestNotes)}</p>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0d9488;">Service quote request</h2>
        <p>A customer submitted contact numbers for pricing. Call to confirm details before setting the MWK price in admin.</p>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Type:</strong> ${escapeHtml(params.kind)}</p>
          <p style="margin: 4px 0;"><strong>Service ref:</strong> #${escapeHtml(ref)}</p>
          <p style="margin: 4px 0;"><strong>Customer:</strong> ${escapeHtml(params.customerName)} (${escapeHtml(params.customerEmail)})</p>
          <p style="margin: 4px 0;"><strong>Mobile (calls):</strong> ${escapeHtml(params.mobilePhone)}</p>
          <p style="margin: 4px 0;"><strong>WhatsApp:</strong> ${escapeHtml(params.whatsAppPhone)}</p>
          ${notesBlock}
        </div>
        <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h3 style="margin-top: 0; color: #0d9488;">Request summary</h3>
          ${linesHtml}
        </div>
        <p style="margin-top: 20px;">
          <a href="${adminUrl}/admin/services" style="color: #0d9488;">Open admin services</a>
        </p>
      </body>
      </html>
    `;

    if (adminEmail) {
      await this.sendEmail({ to: adminEmail, subject, html });
    } else if (process.env.NODE_ENV === 'development') {
      console.log('\n=== QUOTE REQUEST (no admin email configured) ===');
      console.log(subject);
      console.log(params);
      console.log('================================================\n');
    }
  }

  /** Notify admin that a refund must be processed manually in the PayChangu dashboard. */
  async sendAdminPendingRefundNotification(params: {
    paymentId: string;
    type: string;
    amount: number;
    transactionId?: string;
    chargeId?: string;
    reason?: string;
  }): Promise<void> {
    const adminEmail =
      process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SUPPORT_EMAIL;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const ref = params.paymentId.slice(-8).toUpperCase();
    const subject = `[AutoTek] Manual refund pending — MWK ${params.amount.toLocaleString()} — #${ref}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0d9488;">Manual refund required</h2>
        <p>A paid cancellation needs a refund via the PayChangu dashboard (no refund API).</p>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Payment ref:</strong> #${escapeHtml(ref)}</p>
          <p style="margin: 4px 0;"><strong>Type:</strong> ${escapeHtml(params.type)}</p>
          <p style="margin: 4px 0;"><strong>Amount:</strong> MWK ${params.amount.toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${escapeHtml(params.transactionId || 'N/A')}</p>
          <p style="margin: 4px 0;"><strong>Charge ID:</strong> ${escapeHtml(params.chargeId || 'N/A')}</p>
          <p style="margin: 4px 0;"><strong>Reason:</strong> ${escapeHtml(params.reason || 'N/A')}</p>
        </div>
        <ol>
          <li>Refund the customer in the PayChangu dashboard.</li>
          <li>Mark the refund completed in AutoTek Admin → Refunds.</li>
        </ol>
        <p style="margin-top: 20px;">
          <a href="${frontendUrl}/admin/refunds" style="background: #14b8a6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Open admin refunds</a>
        </p>
      </body>
      </html>
    `;

    if (adminEmail) {
      await this.sendEmail({ to: adminEmail, subject, html });
    } else if (process.env.NODE_ENV === 'development') {
      console.log('\n=== PENDING REFUND (no admin email configured) ===');
      console.log(subject);
      console.log(params);
      console.log('=================================================\n');
    }
  }

  /** Customer notice after admin marks a manual PayChangu refund as completed. */
  async sendManualRefundCompletedEmail(params: {
    email: string;
    customerName: string;
    referenceLabel: string;
    refundAmount: number;
  }): Promise<void> {
    const { email, customerName, referenceLabel, refundAmount } = params;
    if (!email) return;

    const subject = `Refund completed #${referenceLabel} - AutoTek`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Completed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Refund Completed</h2>
          <p>Hello ${escapeHtml(customerName)},</p>
          <p>We've completed your refund of <strong>MWK ${refundAmount.toLocaleString()}</strong> (ref #${escapeHtml(referenceLabel)}).</p>
          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46;">
              Funds should appear in your original payment method within 3–5 business days, depending on your mobile money or bank provider.
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AutoTek. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }
}

export const emailService = new EmailService();
