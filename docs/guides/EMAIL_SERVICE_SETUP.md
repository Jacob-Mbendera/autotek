# Email Service Setup Guide

**Last Updated:** March 18, 2026
**Status:** Email infrastructure ready - credentials needed

---

## Overview

The AutoTek email service has been implemented and supports multiple email providers. You need to configure one of the following options before production deployment.

**Current Status:**
- ✅ Email service infrastructure implemented
- ✅ Nodemailer configured
- ✅ Email templates ready
- ⏳ **Email credentials needed** (choose an option below)
- ⏳ Production testing required

---

## Quick Start

### Option 1: SendGrid (Recommended for Malawi) ⭐

**Why SendGrid?**
- Reliable email delivery in Africa
- Good reputation/deliverability
- Simple setup
- Free tier: 100 emails/day
- Paid tier: $20/month for 40,000 emails

**Setup Steps:**

1. **Create SendGrid Account**
   ```
   Visit: https://signup.sendgrid.com/
   - Sign up for free account
   - Verify your email
   - Complete account setup
   ```

2. **Create API Key**
   ```
   - Login to SendGrid Dashboard
   - Settings → API Keys
   - Click "Create API Key"
   - Name: "AutoTek Production"
   - Permission: Full Access
   - Click "Create & View"
   - COPY THE KEY (you won't see it again!)
   ```

3. **Verify Sender Identity**
   ```
   - Settings → Sender Authentication
   - Option A: Single Sender Verification (quickest)
     - Enter: noreply@autotek.mw (or your email)
     - Verify via email

   - Option B: Domain Authentication (better)
     - Authenticate your domain (autotek.mw)
     - Add DNS records provided by SendGrid
     - Wait for verification (24-48 hours)
   ```

4. **Update .env File**
   ```bash
   # backend/.env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=SG.xxxxxxxxxxxxx  # Your API key from step 2
   EMAIL_FROM=AutoTek <noreply@autotek.mw>
   ```

5. **Test Email**
   ```bash
   # In backend directory
   npm run dev

   # Try password reset or create test order
   # Check SendGrid Dashboard → Activity for delivery status
   ```

**Troubleshooting:**
- If emails don't send: Check SendGrid Activity feed
- If emails go to spam: Complete domain authentication (Option B)
- Daily limit reached: Upgrade to paid plan

---

### Option 2: Gmail SMTP (Development/Testing)

**Why Gmail?**
- Free
- Quick setup
- Good for development/testing
- Limited to 500 emails/day

**⚠️ Not recommended for production** - daily limits too low

**Setup Steps:**

1. **Enable 2-Factor Authentication**
   ```
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification
   ```

2. **Create App Password**
   ```
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: Mail
   - Select device: Other (Custom name)
   - Name: "AutoTek Backend"
   - Click Generate
   - COPY THE 16-CHARACTER PASSWORD
   ```

3. **Update .env File**
   ```bash
   # backend/.env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx  # App password from step 2
   EMAIL_FROM=AutoTek <your-email@gmail.com>
   ```

4. **Test Email**
   ```bash
   npm run dev
   # Try password reset
   ```

**Limitations:**
- 500 emails per day maximum
- Gmail branding in email headers
- May be blocked if sending too many emails
- Not suitable for production

---

### Option 3: Custom SMTP Server

**For Organizations with Existing Email Infrastructure**

**Requirements:**
- SMTP server credentials
- Server hostname and port
- Username and password
- TLS/SSL support

**Setup:**
```bash
# backend/.env
EMAIL_HOST=mail.yourcompany.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_USER=noreply@autotek.mw
EMAIL_PASS=your-smtp-password
EMAIL_FROM=AutoTek <noreply@autotek.mw>
```

---

## Email Types Sent by AutoTek

The system sends the following emails:

### 1. **Password Reset Email**
- **Trigger:** User clicks "Forgot Password"
- **Contains:** Reset link with token (expires in 1 hour)
- **Template:** `backend/src/utils/email.ts`
- **Subject:** "Reset Your AutoTek Password"

### 2. **Order Confirmation Email**
- **Trigger:** Order successfully placed
- **Contains:** Order details, items, total, payment method
- **Template:** `emailService.sendOrderConfirmationEmail()`
- **Subject:** "Order Confirmation - #{orderNumber}"

### 3. **Refund Processed Email**
- **Trigger:** Admin processes refund for return
- **Contains:** Refund amount, original order, processing time
- **Template:** `emailService.sendRefundProcessedEmail()`
- **Subject:** "Refund Processed - MWK {amount}"

### 4. **Return Status Update Email** (Future)
- **Trigger:** Return status changes
- **Contains:** Current status, tracking info
- **Not yet implemented**

---

## Testing Email Configuration

### Test 1: Password Reset Email

```bash
# Start backend
cd backend && npm run dev

# Open another terminal and test with curl:
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@autotek.com"}'

# Expected:
# - Console log showing email sent (dev mode)
# - OR actual email received (production mode)
```

### Test 2: Order Confirmation Email

```bash
# Place a test order through frontend
# or via API:

curl -X POST http://localhost:5000/api/orders/guest \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "guestInfo": {"email": "test@example.com", ...}
  }'

# Check email inbox or console logs
```

### Test 3: Refund Email

```bash
# Process a refund through admin panel
# Email will be sent to customer
```

---

## Environment Variables Reference

```bash
# Email Service Configuration

# SMTP Server Hostname (required)
EMAIL_HOST=smtp.sendgrid.net

# SMTP Port (default: 587)
# Use 587 for TLS, 465 for SSL
EMAIL_PORT=587

# SMTP Username (required)
# For SendGrid: always "apikey"
# For Gmail: your-email@gmail.com
# For custom SMTP: provided by host
EMAIL_USER=apikey

# SMTP Password (required)
# For SendGrid: Your API key (starts with SG.)
# For Gmail: 16-character app password
# For custom SMTP: provided by host
EMAIL_PASS=SG.xxxxxxxxxxxxx

# Sender Email Address (required)
# This appears in the "From" field
# Must be verified with your email provider
EMAIL_FROM=AutoTek <noreply@autotek.mw>
```

---

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] Email provider account created
- [ ] API key or credentials generated
- [ ] Sender email verified
- [ ] Domain authentication completed (if using SendGrid)
- [ ] Environment variables set in production .env
- [ ] Test emails sent successfully
- [ ] Emails not going to spam folder
- [ ] All email templates reviewed and tested
- [ ] Unsubscribe links added (if sending marketing emails)
- [ ] Email delivery monitored

---

## Monitoring Email Delivery

### SendGrid Dashboard
```
https://app.sendgrid.com/stats/overview
- View delivery rates
- Check bounce/spam reports
- Monitor API usage
```

### Gmail
```
Limited monitoring available
Check sent folder
May receive bounce notifications
```

### Error Logging
```
All email errors are logged to console:
❌ Error sending email: [error details]
```

---

## Cost Comparison

| Provider | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **SendGrid** | 100/day | $20/month (40K) | Production |
| **Gmail** | 500/day | N/A | Development |
| **AWS SES** | 62K/month (with EC2) | $0.10/1000 | High volume |
| **Mailgun** | 5K/month (3 months) | $35/month (50K) | Production |

**Recommendation for AutoTek:**
- **Development:** Gmail SMTP (free, quick setup)
- **Production:** SendGrid Essentials ($20/month)
- **High Volume:** AWS SES (if sending 100K+ emails/month)

---

## Troubleshooting

### Issue: Emails not sending

**Check:**
1. Environment variables set correctly
   ```bash
   echo $EMAIL_HOST
   echo $EMAIL_USER
   # Should NOT be empty
   ```

2. Backend logs for errors
   ```bash
   npm run dev
   # Look for: ❌ Error sending email
   ```

3. Email provider dashboard
   - Check activity logs
   - Verify API key is active
   - Check daily limits

### Issue: Emails going to spam

**Solutions:**
1. Complete domain authentication (SPF, DKIM, DMARC)
2. Use verified sender email
3. Avoid spam trigger words
4. Add unsubscribe link
5. Maintain good sender reputation

### Issue: Connection timeout

**Check:**
1. SMTP port correct (587 for TLS, 465 for SSL)
2. Firewall not blocking outbound SMTP
3. Server can reach email provider
   ```bash
   telnet smtp.sendgrid.net 587
   ```

### Issue: Authentication failed

**Check:**
1. Username correct (for SendGrid: must be "apikey")
2. Password/API key copied correctly (no extra spaces)
3. API key has correct permissions
4. Account not suspended

---

## Security Best Practices

1. **Never commit credentials**
   ```bash
   # Ensure .env is in .gitignore
   echo ".env" >> .gitignore
   git status
   ```

2. **Use environment variables**
   ```bash
   # Never hardcode in code:
   // ❌ BAD
   pass: 'SG.abcd1234...'

   // ✅ GOOD
   pass: process.env.EMAIL_PASS
   ```

3. **Rotate API keys regularly**
   ```
   - Every 90 days
   - After team member leaves
   - If key possibly compromised
   ```

4. **Monitor usage**
   ```
   - Watch for unusual spike in emails
   - May indicate compromised credentials
   - Set up alerts in provider dashboard
   ```

---

## Next Steps

1. **Choose email provider** (recommend SendGrid)
2. **Create account and get credentials**
3. **Update backend/.env with credentials**
4. **Test email sending** (password reset, order confirmation)
5. **Verify emails not going to spam**
6. **Deploy to production**
7. **Monitor delivery rates**

---

## Support Resources

### SendGrid
- Documentation: https://docs.sendgrid.com/
- Support: https://support.sendgrid.com/
- Status: https://status.sendgrid.com/

### Gmail SMTP
- Guide: https://support.google.com/mail/answer/7126229
- App Passwords: https://myaccount.google.com/apppasswords

### Nodemailer (Library Used)
- Docs: https://nodemailer.com/
- GitHub: https://github.com/nodemailer/nodemailer

---

**Implementation Status:**
- ✅ Email service code complete
- ✅ Configuration templates ready
- ✅ Multiple provider support
- ⏳ **Action Required:** Configure email credentials
- ⏳ **Action Required:** Test in production

---

**Last Updated:** March 18, 2026
**Next Review:** After email provider configured
