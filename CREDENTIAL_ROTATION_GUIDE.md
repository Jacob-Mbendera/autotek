# Credential Rotation Guide - AutoTek Production Setup

**Date:** March 20, 2026
**Priority:** 🔴 URGENT - Do Before Production Deployment
**Estimated Time:** 2-3 hours total

---

## 🎯 Overview

This guide walks you through rotating all exposed credentials and setting up production services. Follow the steps in order.

**Current Status:**
- ❌ MongoDB password exposed in codebase
- ❌ Cloudinary API credentials exposed
- ❌ PayChangu using TEST keys (not production)
- ⚠️ JWT_SECRET is good (newly generated)
- ⏳ Email service not configured
- ⏳ PayChangu webhook secret missing

---

## 📋 STEP 1: MongoDB Password Rotation (30 minutes)

### Current Credentials (DO NOT USE IN PRODUCTION):
```
Username: jaybmbendera96_db_user
Password: 4XzTR0DfL0aV8hWK
Cluster: cluster0.fikzyww.mongodb.net
Database: autotek
```

### Steps to Rotate:

1. **Login to MongoDB Atlas**
   - Go to: https://cloud.mongodb.com/
   - Login with your account

2. **Navigate to Database Access**
   - Click "Database Access" in left sidebar
   - Find user: `jaybmbendera96_db_user`

3. **Change Password**
   - Click "Edit" on the user
   - Click "Edit Password"
   - Choose "Autogenerate Secure Password" (recommended)
   - Or create strong password (min 16 chars, mixed case, numbers, symbols)
   - **COPY THE NEW PASSWORD IMMEDIATELY**

4. **Update .env File**
   ```bash
   # In backend/.env, update line 6:
   MONGODB_URI=mongodb+srv://jaybmbendera96_db_user:YOUR_NEW_PASSWORD@cluster0.fikzyww.mongodb.net/autotek?retryWrites=true&w=majority
   ```

5. **Test Connection**
   ```bash
   cd backend
   npm run dev
   # Should see: "MongoDB connected successfully"
   ```

6. **If Connection Fails:**
   - Check password has no special chars that need URL encoding
   - Encode special chars: `@` → `%40`, `#` → `%23`, etc.
   - Or regenerate password without special chars

---

## 📋 STEP 2: Cloudinary Credentials Rotation (30 minutes)

### Current Credentials (DO NOT USE IN PRODUCTION):
```
Cloud Name: dhbe6wtod
API Key: 462161396227349
API Secret: tK3t2a2u-pDo04EEmzW6u4I_2vc
```

### Steps to Rotate:

1. **Login to Cloudinary**
   - Go to: https://cloudinary.com/console
   - Login with your account

2. **Navigate to Settings → Security**
   - Click gear icon (Settings) in top right
   - Go to "Security" tab
   - Scroll to "Access Keys" section

3. **Regenerate API Key**
   - Click "Generate New Key Pair" button
   - **IMPORTANT:** Copy both API Key and API Secret immediately
   - Click "Regenerate" to confirm

4. **Update .env File**
   ```bash
   # In backend/.env, update lines 17-19:
   CLOUDINARY_CLOUD_NAME=dhbe6wtod  # Cloud name stays the same
   CLOUDINARY_API_KEY=YOUR_NEW_API_KEY
   CLOUDINARY_API_SECRET=YOUR_NEW_API_SECRET
   ```

5. **Test Image Upload**
   ```bash
   # Start backend
   npm run dev

   # Try uploading a product image via admin panel
   # Should upload successfully to Cloudinary
   ```

6. **Verify Upload**
   - Go to Cloudinary Dashboard → Media Library
   - Check recent uploads appear

---

## 📋 STEP 3: PayChangu Production Keys (30 minutes)

### Current Keys (TEST MODE - DO NOT USE IN PRODUCTION):
```
API Key: pub-test-c0CH5zip7ikOYL3tRNVooFSUweSBEG1O
API Secret: sec-test-Ya4SfKr1rRxk73iFvU0i0abbnHX8s8Ef
```

### Steps to Get Production Keys:

1. **Login to PayChangu Dashboard**
   - Go to: https://dashboard.paychangu.com/
   - Login with your merchant account

2. **Navigate to API Keys Section**
   - Look for "Developers" or "API Keys" in sidebar
   - Or go to Settings → API Keys

3. **Switch to Live/Production Mode**
   - Toggle from "Test Mode" to "Live Mode"
   - Or look for "Production Keys" section

4. **Copy Production Keys**
   - **Public Key:** Starts with `pub-live-...`
   - **Secret Key:** Starts with `sec-live-...`
   - **COPY BOTH IMMEDIATELY AND STORE SECURELY**

5. **Update .env File**
   ```bash
   # In backend/.env, update lines 22-23:
   PAYCHANGU_API_KEY=pub-live-YOUR_PRODUCTION_KEY
   PAYCHANGU_API_SECRET=sec-live-YOUR_PRODUCTION_SECRET
   ```

6. **⚠️ IMPORTANT - Webhook Secret**
   - While in PayChangu dashboard, request webhook secret
   - Contact: support@paychangu.com if not visible
   - Update line 25:
   ```bash
   PAYCHANGU_WEBHOOK_SECRET=your_webhook_secret_from_paychangu
   ```

7. **Test Payment (Small Amount)**
   ```bash
   # Start backend
   npm run dev

   # Place small test order (e.g., MWK 100)
   # Complete payment with real money
   # Verify payment webhook received
   # Request refund to test refund API
   ```

---

## 📋 STEP 4: Email Service Configuration (1 hour)

### Recommended: SendGrid (Free tier: 100 emails/day)

#### Option A: SendGrid Setup

1. **Create SendGrid Account**
   - Go to: https://signup.sendgrid.com/
   - Sign up for free account
   - Verify your email address

2. **Create API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: "AutoTek Production"
   - Permission Level: "Full Access"
   - Click "Create & View"
   - **COPY THE KEY IMMEDIATELY (you won't see it again!)**

3. **Verify Sender Identity**

   **Single Sender Verification (Fastest):**
   - Go to Settings → Sender Authentication → Single Sender Verification
   - Click "Create New Sender"
   - Enter: noreply@autotek.mw (or your email)
   - Fill in your details
   - Click "Create"
   - Check email and verify

   **OR Domain Authentication (Better for production):**
   - Go to Settings → Sender Authentication → Authenticate Your Domain
   - Enter your domain: autotek.mw
   - Follow DNS record instructions
   - Add provided DNS records to your domain
   - Wait 24-48 hours for verification

4. **Update .env File**
   ```bash
   # In backend/.env, update lines 51-55:
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=SG.xxxxxxxxxxxxx  # Your SendGrid API key
   EMAIL_FROM=AutoTek <noreply@autotek.mw>
   ```

5. **Test Email Sending**
   ```bash
   cd backend && npm run dev

   # Register new user or trigger password reset
   # Check email inbox
   # Verify email received (not in spam)
   ```

6. **Monitor SendGrid Dashboard**
   - Go to Activity Feed
   - Verify emails are being delivered
   - Check bounce/spam rates

#### Option B: Gmail (For Testing/Low Volume)

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: Mail
   - Select device: Other (Custom name)
   - Enter: "AutoTek Backend"
   - Click Generate
   - **COPY THE 16-CHARACTER PASSWORD**

3. **Update .env File**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx  # App password
   EMAIL_FROM=AutoTek <your-email@gmail.com>
   ```

4. **Limitations:**
   - ⚠️ Maximum 500 emails/day
   - ⚠️ Gmail branding in headers
   - ⚠️ Not recommended for production

---

## 📋 STEP 5: PayChangu Production Setup (30 minutes)

### Contact PayChangu Support

1. **Request Webhook Secret**

   **Email to:** support@paychangu.com

   **Subject:** Request Webhook Secret for Production

   **Body:**
   ```
   Hello PayChangu Team,

   We are deploying AutoTek (autotek.mw) to production and need:

   1. Webhook Secret for signature verification
      - We've implemented HMAC-SHA256 verification
      - Need the secret key to verify webhook authenticity

   2. Confirmation that our webhook endpoint is configured:
      - URL: https://autotek.mw/api/payments/webhook/paychangu
      - Method: POST
      - Expected events: payment.success, payment.failed

   Merchant Account Details:
   - Business Name: AutoTek
   - Public Key: pub-live-xxxxx (your production key)
   - Use Case: E-commerce platform for auto parts and services

   Thank you!

   Best regards,
   AutoTek Team
   ```

2. **Request Refund API Access**

   **Email to:** support@paychangu.com OR developer@paychangu.com

   **Subject:** Enable Refund API Access for Merchant Account

   **Body:**
   ```
   Hello PayChangu Team,

   We need refund API access enabled for our merchant account.

   Use Case:
   - Customers can return purchased products
   - We need to process automatic refunds via API
   - Already implemented: POST /charge-card/refund/{charge_id}

   Merchant Details:
   - Business Name: AutoTek
   - API Key: pub-live-xxxxx
   - Refund Policy: 14-day return window

   Questions:
   1. Is our merchant account approved for refund API access?
   2. Are there any restrictions or limits?
   3. What is the expected refund processing time?

   Thank you!
   ```

3. **Update Webhook Configuration**
   - Once you receive webhook secret from PayChangu
   - Update backend/.env line 25:
   ```bash
   PAYCHANGU_WEBHOOK_SECRET=your_secret_from_paychangu
   ```

4. **Test Webhook Verification**
   ```bash
   # Make a small payment
   # Check backend logs for:
   # "PayChangu webhook: Signature verified successfully"
   ```

---

## ✅ Final Verification Checklist

### MongoDB
- [ ] New password generated
- [ ] .env updated with new password
- [ ] Backend connects successfully
- [ ] Database operations working

### Cloudinary
- [ ] New API key generated
- [ ] .env updated with new credentials
- [ ] Image uploads working
- [ ] Images visible in Media Library

### PayChangu
- [ ] Production keys obtained (pub-live, sec-live)
- [ ] .env updated with production keys
- [ ] Webhook secret received and configured
- [ ] Test payment processed successfully
- [ ] Webhook signature verification working
- [ ] Refund API access confirmed

### Email Service
- [ ] SendGrid account created (or Gmail configured)
- [ ] API key generated
- [ ] Sender verified
- [ ] .env updated with credentials
- [ ] Test emails sending successfully
- [ ] Emails not going to spam
- [ ] SendGrid Activity shows deliveries

### Security
- [ ] All old credentials invalidated/rotated
- [ ] .env file NOT in git repository
- [ ] .gitignore includes .env
- [ ] Production .env stored securely

---

## 🔒 Security Best Practices

1. **Never commit .env to git**
   ```bash
   # Verify .env is in .gitignore
   grep ".env" .gitignore

   # Should see: .env or *.env
   ```

2. **Store production .env securely**
   - Use password manager (1Password, LastPass, Bitwarden)
   - Or encrypted storage
   - Never share via email/Slack

3. **Rotate credentials regularly**
   - Every 90 days minimum
   - After any team member departure
   - If credentials possibly compromised

4. **Use environment-specific keys**
   - Development: Test keys
   - Staging: Separate keys
   - Production: Production keys only

5. **Monitor usage**
   - Check MongoDB Atlas metrics
   - Monitor Cloudinary bandwidth
   - Review PayChangu transactions
   - Check SendGrid activity

---

## 🆘 Troubleshooting

### MongoDB Connection Error
```
Error: Authentication failed
```
**Solution:**
- Double-check password copied correctly
- URL-encode special characters
- Verify IP whitelist in MongoDB Atlas (allow your server IP)

### Cloudinary Upload Error
```
Error: Invalid API key
```
**Solution:**
- Verify API key and secret copied correctly
- Check cloud name is correct
- Regenerate credentials if still failing

### PayChangu Payment Error
```
Error: Invalid API credentials
```
**Solution:**
- Confirm using production keys (pub-live, sec-live)
- Not test keys (pub-test, sec-test)
- Verify keys are active in dashboard

### Email Not Sending
```
Error: Invalid login
```
**Solution:**
- SendGrid: Verify API key starts with SG.
- Gmail: Use app password, not regular password
- Check EMAIL_USER is "apikey" for SendGrid

---

## 📞 Support Contacts

### MongoDB Atlas
- Support: https://www.mongodb.com/cloud/atlas/support
- Docs: https://docs.atlas.mongodb.com/

### Cloudinary
- Support: https://support.cloudinary.com/
- Dashboard: https://cloudinary.com/console

### PayChangu
- Support: support@paychangu.com
- Developer: developer@paychangu.com
- Dashboard: https://dashboard.paychangu.com/
- Docs: https://developer.paychangu.com/

### SendGrid
- Support: https://support.sendgrid.com/
- Dashboard: https://app.sendgrid.com/
- Docs: https://docs.sendgrid.com/

---

## ⏱️ Estimated Timeline

| Task | Time | Can Do Now? |
|------|------|-------------|
| MongoDB Password | 30 min | ✅ Yes |
| Cloudinary Keys | 30 min | ✅ Yes |
| PayChangu Keys | 30 min | ✅ Yes |
| PayChangu Support | 1-3 days | ⏳ Wait for response |
| Email Setup | 1 hour | ✅ Yes |
| Testing | 1 hour | ✅ Yes after setup |

**Total Active Time:** ~3 hours
**Total Calendar Time:** 1-3 days (waiting for PayChangu)

---

**Good luck with the credential rotation! 🔐**

**Last Updated:** March 20, 2026
