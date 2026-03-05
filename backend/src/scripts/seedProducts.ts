import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product';

dotenv.config();

// Sample product data
const categories = [
  'Engine Parts',
  'Brake Parts',
  'Braking System',
  'Electrical',
  'Suspension',
  'Filters',
  'Transmission',
  'Cooling System',
  'Exhaust System',
  'Body Parts',
];

const suppliers = [
  'Bosch',
  'NGK',
  'Denso',
  'ACDelco',
  'Mann Filter',
  'Fram',
  'Mobil 1',
  'Castrol',
  'Valvoline',
  'Autotek Premium',
];

const productNames = [
  // Engine Parts
  'Spark Plug Set',
  'Engine Oil Filter',
  'Air Filter',
  'Fuel Filter',
  'Timing Belt',
  'Water Pump',
  'Thermostat',
  'Radiator Cap',
  'Oil Pan Gasket',
  'Valve Cover Gasket',
  
  // Brake Parts
  'Brake Pad Set (Front)',
  'Brake Pad Set (Rear)',
  'Brake Disc (Front)',
  'Brake Disc (Rear)',
  'Brake Caliper',
  'Brake Fluid',
  'Brake Master Cylinder',
  'Brake Hose',
  'Brake Shoe Set',
  'Brake Drum',
  
  // Electrical
  'Car Battery 12V',
  'Alternator',
  'Starter Motor',
  'Ignition Coil',
  'Distributor Cap',
  'Spark Plug Wire Set',
  'Headlight Bulb',
  'Tail Light Bulb',
  'Fuse Box',
  'Relay Switch',
  
  // Suspension
  'Shock Absorber',
  'Strut Assembly',
  'Coil Spring',
  'Control Arm',
  'Ball Joint',
  'Tie Rod End',
  'Sway Bar Link',
  'Bushing Set',
  'Wheel Bearing',
  'Stabilizer Bar',
  
  // Filters
  'Cabin Air Filter',
  'Oil Filter',
  'Air Intake Filter',
  'Fuel Filter',
  'Transmission Filter',
  'PCV Valve',
  
  // Transmission
  'Transmission Fluid',
  'Transmission Filter',
  'Clutch Kit',
  'Flywheel',
  'Transmission Mount',
  
  // Cooling System
  'Radiator',
  'Cooling Fan',
  'Thermostat',
  'Water Pump',
  'Coolant Hose',
  'Radiator Cap',
  
  // Exhaust System
  'Muffler',
  'Catalytic Converter',
  'Exhaust Pipe',
  'O2 Sensor',
  'Exhaust Gasket',
  
  // Body Parts
  'Windshield Wiper',
  'Wiper Blade',
  'Side Mirror',
  'Headlight Assembly',
  'Tail Light Assembly',
];

const descriptions = [
  'High-quality replacement part for optimal performance',
  'Premium grade component with extended warranty',
  'OEM equivalent part for reliable performance',
  'Durable construction for long-lasting use',
  'Easy installation with included instructions',
  'Compatible with most vehicle models',
  'Manufactured to meet or exceed OEM specifications',
  'Tested and certified for safety and reliability',
  'Professional grade component',
  'Cost-effective replacement solution',
];

// Generate random products
function generateProducts(count: number = 50) {
  const products = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const nameIndex = Math.floor(Math.random() * productNames.length);
    const baseName = productNames[nameIndex];
    const name = `${baseName} ${i + 1}`;
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const price = Math.floor(Math.random() * 500000) + 5000; // MWK 5,000 to 505,000
    const stock = Math.floor(Math.random() * 100) + 1;
    const status: 'available' | 'out-of-stock' = stock > 0 ? 'available' : 'out-of-stock';
    
    // Random badge (30% chance)
    const badgeChance = Math.random();
    let badge: 'new' | 'sale' | 'featured' | undefined = undefined;
    if (badgeChance < 0.1) {
      badge = 'new';
    } else if (badgeChance < 0.2) {
      badge = 'sale';
    } else if (badgeChance < 0.3) {
      badge = 'featured';
    }
    
    products.push({
      name,
      description: `${description}. Perfect for ${category.toLowerCase()} maintenance and repair.`,
      category,
      price,
      stock,
      supplier,
      status,
      badge,
      images: [], // Empty images array - will use placeholders
    });
  }
  
  return products;
}

// Seed function
async function seedProducts() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autotek';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check existing products
    const existingCount = await Product.countDocuments();
    console.log(`📊 Found ${existingCount} existing products`);
    
    // Generate products
    const productCount = 50; // Generate 50 products for testing pagination
    console.log(`🌱 Generating ${productCount} test products...`);
    const products = generateProducts(productCount);

    // Insert products
    await Product.insertMany(products);
    console.log(`✅ Successfully created ${productCount} products`);

    // Show summary
    const totalProducts = await Product.countDocuments();
    const byCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    console.log('\n📊 Product Summary:');
    console.log(`Total Products: ${totalProducts}`);
    console.log('\nBy Category:');
    byCategory.forEach((cat) => {
      console.log(`  ${cat._id}: ${cat.count}`);
    });

    console.log('\n✨ Seeding completed successfully!');
    console.log('\n💡 You can now test pagination in the admin products page!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding products:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run seed
seedProducts();
