# Environment Variables Template

Copy this template to create your `.env` file in the `backend/` directory.

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/autotek?retryWrites=true&w=majority
# For local MongoDB: mongodb://localhost:27017/autotek
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
# Generate a secure random string (minimum 32 characters)
# Use: openssl rand -base64 32
JWT_SECRET=your_super_secret_jwt_key_here_min_32_characters

# Airtel Money API Configuration
# UAT/Sandbox URL: https://openapiuat.airtel.africa
# Production URL: https://openapi.airtel.africa
AIRTEL_API_URL=https://openapiuat.airtel.africa
AIRTEL_CLIENT_ID=your_airtel_client_id
AIRTEL_CLIENT_SECRET=your_airtel_client_secret

# Cloudinary Configuration
# Get these from: https://cloudinary.com/console/settings/api-keys
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# PayChangu Payment Gateway Configuration
# Get these from: https://paychangu.com (or your PayChangu dashboard)
PAYCHANGU_API_KEY=your_paychangu_api_key
PAYCHANGU_API_SECRET=your_paychangu_api_secret
PAYCHANGU_BASE_URL=https://api.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=your_paychangu_webhook_secret

# Frontend URL (for payment redirects)
FRONTEND_URL=http://localhost:5173
```

## Instructions

1. Create a `.env` file in the `backend/` directory
2. Copy the template above
3. Replace all placeholder values with your actual credentials
4. Make sure `.env` is in `.gitignore` (it should be by default)

## Getting Credentials

See `SETUP_GUIDE.md` for detailed instructions on how to obtain:
- Airtel Money API credentials
- Cloudinary API credentials
- MongoDB connection string
- JWT secret generation
