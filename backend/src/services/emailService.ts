import nodemailer from 'nodemailer';
import Order, { IOrder } from '../models/Order';
import User, { IUser } from '../models/User';
import { sendPasswordResetEmail } from '../utils/email';

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
            We'll send you another email when your order ships. If you have any questions, please contact our support team.
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

    const statusMessages: Record<string, { subject: string; message: string }> = {
      processing: {
        subject: `Your Order #${orderId} is Being Processed`,
        message: 'Your order is now being processed and will be prepared for shipment soon.',
      },
      completed: {
        subject: `Your Order #${orderId} Has Been Delivered`,
        message: 'Your order has been delivered! We hope you enjoy your purchase.',
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
          <p>Hello ${userName},</p>
          <p>${statusInfo.message}</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #14b8a6; margin-top: 0;">Order #${orderId}</h3>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
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

  async sendServiceConfirmation(service: any, user: IUser): Promise<void> {
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
            <p style="margin: 5px 0;"><strong>Service Type:</strong> ${service.serviceType || 'N/A'}</p>
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
}

export const emailService = new EmailService();
