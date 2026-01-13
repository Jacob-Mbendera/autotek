# AutoTek - Spare Parts Online Shop

A full-stack MERN (MongoDB, Express, React, Node.js) application with TypeScript for a spare parts online shop in Malawi. Customers can purchase spare parts, request custom orders for unavailable items, request towing services, and schedule home car services.

## Features

### Customer Features
- 🔐 User authentication (JWT-based)
- 🛍️ Browse and search products with filters
- 🛒 Shopping cart and checkout
- 📦 Order tracking and history
- 🔧 Request custom orders for unavailable items
- 🚗 Request towing services
- 🔩 Request home car services (oil change, brake pads, spark plugs, etc.)
- 💳 Payment integration (Airtel Money & Bank Transfer)
- 📱 Progressive Web App (PWA) support

### Admin Features
- 📊 Dashboard with statistics
- 📦 Product management (CRUD)
- 📋 Order management
- 🔧 Service request management
- 👥 User management
- 💰 Payment transaction tracking

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Payment**: Airtel Money API integration

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **PWA**: Service Worker, Web App Manifest

## Project Structure

```
autotek/
├── backend/          # Express + TypeScript + MongoDB
│   ├── src/
│   │   ├── config/   # Database configuration
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # API routes
│   │   ├── services/    # External service integrations
│   │   ├── utils/      # Helper functions
│   │   └── server.ts   # Express server
│   └── package.json
├── frontend/         # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── context/    # React Context
│   │   ├── services/   # API services
│   │   └── ...
│   └── package.json
└── shared/           # Shared TypeScript types
    └── types/
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/autotek.git
   cd autotek
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**

   **Backend** (`backend/.env`):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/autotek
   JWT_SECRET=your-secret-key-change-in-production
   
   # Airtel Money API (Malawi)
   AIRTEL_API_URL=https://openapiuat.airtel.africa
   AIRTEL_CLIENT_ID=your_client_id
   AIRTEL_CLIENT_SECRET=your_client_secret
   
   NODE_ENV=development
   ```

   **Frontend** (`frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Start the development servers**

   **Backend**:
   ```bash
   cd backend
   npm run dev
   ```

   **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details

### Custom Orders
- `POST /api/custom-orders` - Request custom order
- `GET /api/custom-orders` - Get user's custom orders

### Services
- `POST /api/towing` - Request towing service
- `GET /api/towing` - Get towing requests
- `POST /api/car-services` - Request car service
- `GET /api/car-services` - Get car service requests

### Payments
- `POST /api/payments/initiate` - Initiate payment
- `GET /api/payments/:id` - Get payment status

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/orders` - All orders
- `GET /api/admin/custom-orders` - All custom orders
- `GET /api/admin/services` - All services

## Application Context

- **Country**: Malawi
- **Currency**: MWK (Malawi Kwacha)
- **Phone Format**: +265XXXXXXXXX or 0XXXXXXXXX
- **Payment Methods**: Airtel Money, Bank Transfer

## Development

### Backend Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Start production server
```

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Best Practices

This project follows industry best practices:
- ✅ Input validation and sanitization
- ✅ Type safety with TypeScript
- ✅ Proper error handling
- ✅ Authentication and authorization
- ✅ Database indexing for performance
- ✅ Code organization and separation of concerns
- ✅ Logging for debugging
- ✅ API documentation considerations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Contact

For questions or support, please contact the development team.
