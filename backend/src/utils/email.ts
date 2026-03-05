/**
 * Email utility functions
 * For production, integrate with a service like SendGrid, AWS SES, or Nodemailer
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send password reset email
 * In production, this should integrate with an email service
 * For now, we'll log the email content (useful for development)
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetUrl: string
): Promise<void> => {
  const subject = 'Password Reset Request - AutoTek';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">AutoTek</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your AutoTek account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${resetUrl}</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          <strong>This link will expire in 1 hour.</strong>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} AutoTek. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Password Reset Request - AutoTek
    
    Hello ${name},
    
    We received a request to reset your password for your AutoTek account.
    
    Click the following link to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    
    © ${new Date().getFullYear()} AutoTek. All rights reserved.
  `;

  // In development, log the email
  if (process.env.NODE_ENV === 'development') {
    console.log('\n=== PASSWORD RESET EMAIL ===');
    console.log('To:', email);
    console.log('Subject:', subject);
    console.log('Reset URL:', resetUrl);
    console.log('===========================\n');
  }

  // TODO: Integrate with email service (SendGrid, AWS SES, Nodemailer, etc.)
  // Example with Nodemailer:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({ to: email, subject, html, text });

  // For now, we'll just log it in development
  // In production, you should integrate with an actual email service
};
