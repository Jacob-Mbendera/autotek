# Quick Start Guide - Airtel Money & Cloudinary Setup

## ✅ What's Been Configured

1. **Cloudinary Integration**
   - ✅ Cloudinary SDK installed
   - ✅ Cloudinary configuration file created
   - ✅ Image upload middleware (Multer) configured
   - ✅ Product controller updated to handle image uploads
   - ✅ Automatic image deletion when products are deleted

2. **Airtel Money Integration**
   - ✅ Already configured in the codebase
   - ✅ Just needs credentials in `.env` file

## 🚀 Next Steps

### Step 1: Get Airtel Money Credentials

1. Visit [Airtel Developer Portal](https://developers.airtel.africa)
2. Sign up/Login
3. Create a new application
4. Select **Malawi (MW)** as country
5. Copy your **Client ID** and **Client Secret**

**For Testing**: Use UAT/Sandbox environment
**For Production**: Complete merchant onboarding first

### Step 2: Get Cloudinary Credentials

1. Visit [Cloudinary](https://cloudinary.com/users/register/free)
2. Sign up for free account
3. Go to Dashboard → Settings → API Keys
4. Copy your **Cloud Name**, **API Key**, and **API Secret**

### Step 3: Create `.env` File

In the `backend/` directory, create a `.env` file:

```bash
cd backend
touch .env
```

Then add your credentials (see `ENV_TEMPLATE.md` for the full template):

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here

# Airtel Money
AIRTEL_API_URL=https://openapiuat.airtel.africa
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 4: Test the Configuration

1. Start the backend:
```bash
cd backend
npm run dev
```

2. Test endpoints:
```bash
./test-endpoints.sh
```

3. Test image upload (create a product with images via API)

## 📚 Detailed Documentation

- **Full Setup Guide**: See `SETUP_GUIDE.md`
- **Environment Template**: See `ENV_TEMPLATE.md`

## 🔒 Security Reminders

- ✅ `.env` file is already in `.gitignore`
- ✅ Never commit credentials to Git
- ✅ Use UAT credentials for testing
- ✅ Use production credentials only when ready to go live

## 🎯 API Endpoints for Image Upload

### Create Product with Images
```
POST /api/products
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body:
  - name: "Product Name"
  - description: "Description"
  - category: "Category"
  - price: 50000
  - stock: 10
  - images: [file1, file2, ...] (multipart files)
```

### Update Product Images
```
PUT /api/products/:id
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body:
  - images: [new files] (optional)
  - imagesToDelete: ["url1", "url2"] (optional)
```

Images are automatically:
- ✅ Uploaded to Cloudinary
- ✅ Stored as secure URLs in database
- ✅ Deleted from Cloudinary when product is deleted
- ✅ Optimized (auto format, quality)

## ❓ Need Help?

See `SETUP_GUIDE.md` for:
- Detailed step-by-step instructions
- Troubleshooting common issues
- Security best practices
- Support resources
