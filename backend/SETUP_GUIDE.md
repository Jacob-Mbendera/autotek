# AutoTek Backend Setup Guide

This guide will help you configure Airtel Money API and Cloudinary for the AutoTek backend.

## Table of Contents
1. [Airtel Money API Setup](#airtel-money-api-setup)
2. [PayChangu Payment Gateway Setup](#paychangu-payment-gateway-setup)
3. [Cloudinary Setup](#cloudinary-setup)
4. [Environment Variables Configuration](#environment-variables-configuration)
5. [Testing the Configuration](#testing-the-configuration)

---

## Airtel Money API Setup

### Step 1: Register for Airtel Developer Account

1. Visit the [Airtel Developer Portal](https://developers.airtel.africa)
2. Click on "Sign Up" or "Register" to create a new account
3. Fill in your business details:
   - Company name
   - Business registration number
   - Contact information
   - Business address

### Step 2: Create an Application

1. After logging in, navigate to **"My Apps"** or **"Applications"** section
2. Click **"Create New Application"** or **"Add App"**
3. Fill in the application details:
   - **Application Name**: AutoTek Spare Parts Shop
   - **Description**: Online spare parts shop with payment integration
   - **Environment**: Choose between:
     - **UAT (Sandbox)**: For testing (recommended to start)
     - **Production**: For live transactions
   - **Country**: Select **Malawi (MW)**
   - **Currency**: Select **Malawi Kwacha (MWK)**

### Step 3: Get Your API Credentials

After creating the application, you'll receive:
- **Client ID** (`AIRTEL_CLIENT_ID`)
- **Client Secret** (`AIRTEL_CLIENT_SECRET`)
- **API Base URL** (different for UAT and Production)

**Important Notes:**
- **UAT/Sandbox URL**: `https://openapiuat.airtel.africa`
- **Production URL**: `https://openapi.airtel.africa`
- Keep your credentials secure and never commit them to version control
- The Client Secret is only shown once - save it immediately

### Step 4: Request Production Access (When Ready)

1. Complete the merchant onboarding process
2. Submit required business documents
3. Wait for Airtel's approval
4. Once approved, you'll receive production credentials

### Step 5: Test Your Credentials

Use the test script to verify your credentials work:
```bash
cd backend
npm run dev
# In another terminal
./test-endpoints.sh
```

---

## PayChangu Payment Gateway Setup

PayChangu is a payment gateway that supports multiple payment methods including cards, mobile money, and bank transfers. This guide will help you set up PayChangu for AutoTek.

### Step 1: Register for PayChangu Account

1. Visit the [PayChangu website](https://paychangu.com) or contact PayChangu support
2. Click on **"Sign Up"** or **"Register"** to create a merchant account
3. Fill in your business details:
   - Company name
   - Business registration number
   - Contact information
   - Business address
   - Bank account details (for payouts)

### Step 2: Complete Merchant Onboarding

1. Submit required business documents:
   - Business registration certificate
   - Tax identification number
   - Bank account verification
   - Identity verification for business owners
2. Wait for PayChangu's approval (usually 1-3 business days)
3. Once approved, you'll receive access to the merchant dashboard

### Step 3: Get Your API Credentials

1. After logging into the PayChangu merchant dashboard
2. Navigate to **"Settings"** → **"API Keys"** or **"Developer Settings"**
3. You'll find:
   - **API Key** (`PAYCHANGU_API_KEY`)
   - **API Secret** (`PAYCHANGU_API_SECRET`)
   - **Webhook Secret** (`PAYCHANGU_WEBHOOK_SECRET`) - for verifying webhook requests
   - **Base URL** (usually `https://api.paychangu.com`)

**Important Notes:**
- Keep your credentials secure and never commit them to version control
- The API Secret is sensitive - save it immediately
- Webhook Secret is used to verify that webhook requests come from PayChangu

### Step 4: Configure Webhook URL

1. In the PayChangu dashboard, go to **"Settings"** → **"Webhooks"**
2. Add your webhook URL:
   - **Development**: `http://your-domain.com/api/payments/webhook/paychangu`
   - **Production**: `https://your-domain.com/api/payments/webhook/paychangu`
3. Select events to receive:
   - Payment completed
   - Payment failed
   - Payment cancelled
4. Save the webhook configuration

### Step 5: Test Your Configuration

1. Use PayChangu's test mode (if available) to test payments
2. Test the Standard Checkout flow:
   - Create a test order
   - Select PayChangu as payment method
   - Complete the payment on PayChangu's hosted page
   - Verify webhook is received and payment status is updated

### Step 6: Go Live

1. Complete all verification steps
2. Switch from test mode to production mode
3. Update your `.env` file with production credentials
4. Update webhook URL to production domain
5. Test with a small real transaction first

### PayChangu Standard Checkout Flow

AutoTek uses PayChangu's Standard Checkout (hosted page) for easier implementation:

1. **Customer selects PayChangu** at checkout
2. **Backend creates checkout session** via PayChangu API
3. **Customer is redirected** to PayChangu's hosted payment page
4. **Customer completes payment** on PayChangu's page
5. **PayChangu redirects back** to AutoTek with payment status
6. **Webhook is sent** to AutoTek backend to confirm payment
7. **Order status is updated** based on payment result

### Supported Payment Methods

PayChangu supports:
- **Credit/Debit Cards** (Visa, Mastercard)
- **Mobile Money** (Airtel Money, TNM Mpamba, etc.)
- **Bank Transfers**

### Common Issues

**Error: "PayChangu API credentials not configured"**
- ✅ Check that `PAYCHANGU_API_KEY` and `PAYCHANGU_API_SECRET` are set in `.env`
- ✅ Verify there are no extra spaces or quotes in `.env` file
- ✅ Ensure credentials are correct from PayChangu dashboard

**Error: "Failed to create PayChangu checkout session"**
- ✅ Verify API credentials are correct
- ✅ Check that `PAYCHANGU_BASE_URL` is correct
- ✅ Ensure your PayChangu account is active and approved
- ✅ Check PayChangu API status/downtime

**Webhook not received**
- ✅ Verify webhook URL is correctly configured in PayChangu dashboard
- ✅ Check that your server is accessible from the internet (for production)
- ✅ Ensure webhook endpoint is public (no authentication required)
- ✅ Check server logs for webhook requests

**Payment status not updating**
- ✅ Verify webhook is being received
- ✅ Check webhook secret verification (if implemented)
- ✅ Review webhook handler logs
- ✅ Manually verify payment status in PayChangu dashboard

---

## Cloudinary Setup

### Step 1: Create a Cloudinary Account

1. Visit [Cloudinary](https://cloudinary.com/users/register/free)
2. Click **"Sign Up for Free"**
3. Fill in your details:
   - Email address
   - Password
   - Full name
   - Company name (optional)

### Step 2: Verify Your Email

1. Check your email inbox for verification email
2. Click the verification link
3. Complete your profile setup

### Step 3: Get Your API Credentials

1. After logging in, go to the **Dashboard**
2. Navigate to **Settings** → **API Keys** (or visit [API Keys page](https://cloudinary.com/console/settings/api-keys))
3. You'll find:
   - **Cloud Name** (`CLOUDINARY_CLOUD_NAME`)
   - **API Key** (`CLOUDINARY_API_KEY`)
   - **API Secret** (`CLOUDINARY_API_SECRET`)

**Important Notes:**
- The API Secret is sensitive - keep it secure
- You can regenerate API keys if needed
- Free tier includes:
  - 25 GB storage
  - 25 GB monthly bandwidth
  - Unlimited transformations

### Step 4: Configure Upload Presets (Optional but Recommended)

1. Go to **Settings** → **Upload** → **Upload Presets**
2. Create a new upload preset:
   - **Preset Name**: `autotek-products`
   - **Signing Mode**: Unsigned (for easier client-side uploads) or Signed (more secure)
   - **Folder**: `autotek/products` (to organize uploads)
   - **Allowed Formats**: `jpg, png, webp`
   - **Max File Size**: 10 MB (adjust as needed)
   - **Transformation**: Add any default transformations (e.g., auto-format, quality)

### Step 5: Test Your Configuration

After setting up environment variables, test image upload:
```bash
# The backend will automatically use Cloudinary when configured
# Test by creating a product with images via API
```

---

## Environment Variables Configuration

### Step 1: Create `.env` File

In the `backend/` directory, create a `.env` file (if it doesn't exist):

```bash
cd backend
touch .env
```

### Step 2: Add Required Variables

Copy the following template and fill in your actual values:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_min_32_characters

# Airtel Money API Configuration
AIRTEL_API_URL=https://openapiuat.airtel.africa
AIRTEL_CLIENT_ID=your_airtel_client_id
AIRTEL_CLIENT_SECRET=your_airtel_client_secret

# PayChangu Payment Gateway Configuration
PAYCHANGU_API_KEY=your_paychangu_api_key
PAYCHANGU_API_SECRET=your_paychangu_api_secret
PAYCHANGU_BASE_URL=https://api.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=your_paychangu_webhook_secret

# Frontend URL (for payment redirects)
FRONTEND_URL=http://localhost:5173

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Step 3: Fill in Your Values

Replace the placeholder values with your actual credentials:

#### MongoDB URI
- If using MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/autotek?retryWrites=true&w=majority`
- If using local MongoDB: `mongodb://localhost:27017/autotek`

#### JWT Secret
- Generate a secure random string (minimum 32 characters)
- You can use: `openssl rand -base64 32` or any password generator

#### Airtel Money Credentials
- Copy from your Airtel Developer Portal application
- Use UAT URL for testing: `https://openapiuat.airtel.africa`
- Use Production URL for live: `https://openapi.airtel.africa`

#### PayChangu Credentials
- Copy from PayChangu merchant dashboard → Settings → API Keys
- Base URL is usually `https://api.paychangu.com`
- Webhook Secret is used to verify webhook requests from PayChangu
- Frontend URL should match your frontend domain (for payment redirects)

#### Cloudinary Credentials
- Copy from Cloudinary Dashboard → Settings → API Keys

### Step 4: Verify `.env` File

Make sure your `.env` file:
- ✅ Is in the `backend/` directory
- ✅ Is listed in `.gitignore` (should not be committed to Git)
- ✅ Has no spaces around the `=` sign
- ✅ Has no quotes around values (unless the value itself contains spaces)

---

## Testing the Configuration

### Test Airtel Money Configuration

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Run the test script:
```bash
./test-endpoints.sh
```

3. Look for the payment test section. If credentials are correct, you should see:
   - ✅ Successful authentication
   - ✅ Payment request sent (in UAT, this will be a test transaction)

### Test Cloudinary Configuration

1. The backend will automatically use Cloudinary when credentials are set
2. Test by creating a product with images via the API
3. Check Cloudinary Dashboard → Media Library to see uploaded images

### Common Issues

#### Airtel Money Issues

**Error: "Failed to authenticate with Airtel Money"**
- ✅ Check that `AIRTEL_CLIENT_ID` and `AIRTEL_CLIENT_SECRET` are correct
- ✅ Verify you're using the correct API URL (UAT vs Production)
- ✅ Ensure there are no extra spaces or quotes in `.env` file
- ✅ Check that your Airtel account is active

**Error: "Invalid credentials"**
- ✅ Double-check credentials from Airtel Developer Portal
- ✅ Ensure you're using credentials for the correct environment (UAT/Production)
- ✅ Try regenerating credentials if needed

#### Cloudinary Issues

**Error: "Invalid cloud name"**
- ✅ Verify `CLOUDINARY_CLOUD_NAME` is correct (usually your account name)
- ✅ Check for typos in the cloud name

**Error: "Invalid API key or secret"**
- ✅ Verify both `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are correct
- ✅ Check Cloudinary Dashboard to ensure keys are active
- ✅ Regenerate keys if needed

**Images not uploading**
- ✅ Check file size (free tier has limits)
- ✅ Verify file format is supported
- ✅ Check network connectivity
- ✅ Review server logs for detailed error messages

---

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Ensure `.env` is in `.gitignore`
   - Use `.env.example` for documentation

2. **Use different credentials for different environments**
   - Development: UAT/Sandbox credentials
   - Production: Production credentials

3. **Rotate credentials regularly**
   - Change API keys periodically
   - Revoke old keys when rotating

4. **Limit API key permissions**
   - Use least privilege principle
   - Only grant necessary permissions

5. **Monitor usage**
   - Check Cloudinary usage dashboard
   - Monitor Airtel transaction logs
   - Set up alerts for unusual activity

---

## Next Steps

After configuring both services:

1. ✅ Test all endpoints using `./test-endpoints.sh`
2. ✅ Verify image uploads work for products
3. ✅ Test payment flow with Airtel Money (UAT)
4. ✅ Set up production credentials when ready to go live
5. ✅ Configure monitoring and alerts

---

## Support Resources

### Airtel Money
- [Airtel Developer Portal](https://developers.airtel.africa)
- [Airtel Money API Documentation](https://developers.airtel.africa/docs)
- Support: Contact through Developer Portal

### PayChangu
- [PayChangu Website](https://paychangu.com)
- PayChangu Merchant Dashboard (login required)
- Support: Contact through merchant dashboard or support email

### Cloudinary
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Cloudinary Support](https://support.cloudinary.com)

---

**Last Updated**: January 2025
