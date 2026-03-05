import nodemailer from 'nodemailer';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { sendPasswordResetEmail } from '../utils/email';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize transporter if email credentials are provided
    if (
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
    ) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    const emailFrom = process.env.EMAIL_FROM || 'AutoTek <noreply@autotek.mw>';

    // In development, log emails instead of sending
    if (process.env.NODE_ENV === 'development' || !this.transporter) {
      console.log('\n=== EMAIL ===');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('HTML:', options.html.substring(0, 200) + '...');
      console.log('=============\n');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw - email failures shouldn't break the app
    }
  }

  async sendOrderConfirmation(order: Order, user?: User, guestEmail?: string): Promise<void> {
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

  async sendOrderStatusUpdate(order: Order, user?: User, guestEmail?: string): Promise<void> {
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

  async sendServiceConfirmation(service: any, user: User): Promise<void> {
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

  async sendWelcomeEmail(user: User): Promise<void> {
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

  async sendPasswordReset(user: User, resetToken: string): Promise<void> {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
  }
}

export const emailService = new EmailService();
