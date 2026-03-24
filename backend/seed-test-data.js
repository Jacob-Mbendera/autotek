/**
 * Test Data Seeding Script for AutoTek
 * Creates test data for returns & refunds testing
 * WARNING: This script should ONLY be run in development!
 */

require('dotenv').config();
const mongoose = require('mongoose');

// CRITICAL: Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('\n❌ ERROR: Cannot run seed scripts in production environment!');
  console.error('This script creates test data and should only be used in development.\n');
  process.exit(1);
}

// Schema definitions (inline to avoid TypeScript compilation)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  address: String,
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  images: [String],
  supplier: String,
  status: { type: String, enum: ['available', 'out-of-stock', 'discontinued'], default: 'available' },
  badge: String,
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number,
  }],
  totalAmount: Number,
  discount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled'], default: 'pending' },
  paymentMethod: String,
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  shippingAddress: String,
}, { timestamps: true });

const PaymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: { type: String, enum: ['order', 'towing', 'car-service'], required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  transactionId: String,
  chargeId: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

// Models
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}${'='.repeat(50)}${colors.reset}\n`),
};

// Test user credentials (already created)
const TEST_USER_EMAIL = 'testuser@autotek.com';
const ADMIN_EMAIL = 'admintest@autotek.com';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

// Get or create products
async function ensureProducts() {
  log.section('Checking Products');

  try {
    const existingProducts = await Product.find({ status: 'available' }).limit(5);

    if (existingProducts.length >= 3) {
      log.success(`Found ${existingProducts.length} existing products`);
      return existingProducts;
    }

    log.info('Creating additional test products...');

    const products = [
      {
        name: 'Premium Brake Pads Set',
        description: 'High-performance ceramic brake pads for improved stopping power',
        category: 'Brake System',
        price: 45000,
        stock: 20,
        images: [],
        supplier: 'Brembo',
        status: 'available',
        badge: 'best-seller',
      },
      {
        name: 'Oil Filter Premium',
        description: 'High-efficiency oil filter for engine protection',
        category: 'Engine Parts',
        price: 8500,
        stock: 50,
        images: [],
        supplier: 'Mann Filter',
        status: 'available',
        badge: 'featured',
      },
      {
        name: 'Air Filter Heavy Duty',
        description: 'Long-lasting air filter for optimal engine performance',
        category: 'Engine Parts',
        price: 12000,
        stock: 30,
        images: [],
        supplier: 'K&N',
        status: 'available',
      },
    ];

    const createdProducts = await Product.insertMany(products);
    log.success(`Created ${createdProducts.length} new products`);

    return [...existingProducts, ...createdProducts];
  } catch (error) {
    log.error(`Error with products: ${error.message}`);
    throw error;
  }
}

// Get test user
async function getTestUser() {
  log.section('Getting Test User');

  try {
    const user = await User.findOne({ email: TEST_USER_EMAIL });

    if (!user) {
      log.error(`Test user not found: ${TEST_USER_EMAIL}`);
      log.info('Please run the authentication tests first to create the user');
      process.exit(1);
    }

    log.success(`Found test user: ${user.name} (${user.email})`);
    return user;
  } catch (error) {
    log.error(`Error finding user: ${error.message}`);
    throw error;
  }
}

// Create completed orders
async function createCompletedOrders(user, products) {
  log.section('Creating Completed Orders');

  try {
    // Check existing orders
    const existingOrders = await Order.find({
      user: user._id,
      status: 'completed'
    });

    if (existingOrders.length >= 3) {
      log.warning(`User already has ${existingOrders.length} completed orders`);
      log.info('Skipping order creation');
      return existingOrders;
    }

    const ordersToCreate = [];
    const paymentsToCreate = [];

    // Order 1: Single item
    const order1Date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const order1Items = [
      {
        product: products[0]._id,
        quantity: 2,
        price: products[0].price,
      }
    ];
    const order1Total = order1Items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order1 = {
      user: user._id,
      items: order1Items,
      totalAmount: order1Total,
      discount: 0,
      status: 'completed',
      paymentMethod: 'paychangu',
      paymentStatus: 'completed',
      shippingAddress: user.address || '123 Test Street, Lilongwe, Malawi',
      createdAt: order1Date,
      updatedAt: order1Date,
    };

    // Order 2: Multiple items with discount
    const order2Date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const order2Items = [
      {
        product: products[1]._id,
        quantity: 3,
        price: products[1].price,
      },
      {
        product: products[2]._id,
        quantity: 1,
        price: products[2].price,
      }
    ];
    const order2Subtotal = order2Items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const order2Discount = Math.round(order2Subtotal * 0.1); // 10% discount

    const order2 = {
      user: user._id,
      items: order2Items,
      totalAmount: order2Subtotal - order2Discount,
      discount: order2Discount,
      status: 'completed',
      paymentMethod: 'paychangu',
      paymentStatus: 'completed',
      shippingAddress: user.address || '123 Test Street, Lilongwe, Malawi',
      createdAt: order2Date,
      updatedAt: order2Date,
    };

    // Order 3: Recent order
    const order3Date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const order3Items = [
      {
        product: products[0]._id,
        quantity: 1,
        price: products[0].price,
      },
      {
        product: products[1]._id,
        quantity: 2,
        price: products[1].price,
      }
    ];
    const order3Total = order3Items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order3 = {
      user: user._id,
      items: order3Items,
      totalAmount: order3Total,
      discount: 0,
      status: 'completed',
      paymentMethod: 'paychangu',
      paymentStatus: 'completed',
      shippingAddress: user.address || '123 Test Street, Lilongwe, Malawi',
      createdAt: order3Date,
      updatedAt: order3Date,
    };

    ordersToCreate.push(order1, order2, order3);

    // Create orders
    const createdOrders = await Order.insertMany(ordersToCreate);
    log.success(`Created ${createdOrders.length} completed orders`);

    // Create payment records for each order
    for (const order of createdOrders) {
      const payment = {
        order: order._id,
        type: 'order',
        amount: order.totalAmount,
        method: order.paymentMethod,
        transactionId: `TEST_${order._id}_${Date.now()}`,
        chargeId: `CHARGE_TEST_${order._id}_${Date.now()}`, // Mock chargeId for refund testing
        status: 'completed',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
      paymentsToCreate.push(payment);
    }

    const createdPayments = await Payment.insertMany(paymentsToCreate);
    log.success(`Created ${createdPayments.length} payment records`);

    // Display order details
    console.log('\n📦 Created Orders:');
    for (let i = 0; i < createdOrders.length; i++) {
      const order = createdOrders[i];
      console.log(`\n  Order ${i + 1}:`);
      console.log(`    ID: ${order._id}`);
      console.log(`    Items: ${order.items.length} product(s)`);
      console.log(`    Total: MWK ${order.totalAmount.toLocaleString()}`);
      console.log(`    Discount: MWK ${order.discount.toLocaleString()}`);
      console.log(`    Payment: ${order.paymentMethod}`);
      console.log(`    Date: ${order.createdAt.toLocaleDateString()}`);
    }

    return createdOrders;
  } catch (error) {
    log.error(`Error creating orders: ${error.message}`);
    throw error;
  }
}

// Display summary
function displaySummary(user, products, orders) {
  log.section('Seeding Summary');

  console.log(`${colors.green}✓ Test Data Ready${colors.reset}\n`);
  console.log(`👤 Test User: ${user.name} (${user.email})`);
  console.log(`📦 Products Available: ${products.length}`);
  console.log(`🛍️  Completed Orders: ${orders.length}`);
  console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
  console.log(`  1. Run backend tests: ./test-returns-refunds.sh`);
  console.log(`  2. Test return creation flow`);
  console.log(`  3. Test admin approval/rejection`);
  console.log(`  4. Test refund processing`);
  console.log(`\n${colors.blue}Order IDs for Testing:${colors.reset}`);
  orders.forEach((order, i) => {
    console.log(`  Order ${i + 1}: ${order._id}`);
  });
}

// Main seeding function
async function seed() {
  try {
    log.section('AutoTek Test Data Seeding');

    await connectDB();

    const products = await ensureProducts();
    const user = await getTestUser();
    const orders = await createCompletedOrders(user, products);

    displaySummary(user, products, orders);

    process.exit(0);
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run seeding
seed();
