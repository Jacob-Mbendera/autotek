# AutoTek Backend Setup Guide

This guide will help you configure Airtel Money API and Cloudinary for the AutoTek backend.

## Table of Contents
1. [Airtel Money API Setup](#airtel-money-api-setup)
2. [Cloudinary Setup](#cloudinary-setup)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [Testing the Configuration](#testing-the-configuration)

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

### Cloudinary
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Cloudinary Support](https://support.cloudinary.com)

---

**Last Updated**: January 2025
