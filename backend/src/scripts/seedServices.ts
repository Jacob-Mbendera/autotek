import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import User from '../models/User';
import { ServiceStatus, ServiceType } from '../types/shared';

dotenv.config();

// Sample data for Malawi
const malawiCities = [
  'Lilongwe',
  'Blantyre',
  'Mzuzu',
  'Zomba',
  'Kasungu',
  'Mangochi',
  'Karonga',
  'Salima',
  'Nkhotakota',
  'Dedza',
];

const malawiAddresses = [
  'Area 47, Lilongwe',
  'Area 25, Lilongwe',
  'Chilomoni, Blantyre',
  'Namiwawa, Blantyre',
  'Mzuzu City Centre',
  'Zomba Town',
  'Kasungu Market Area',
  'Mangochi Beach Road',
  'Karonga Main Street',
  'Salima Lakeshore',
];

const vehicleMakes = [
  'Toyota',
  'Honda',
  'Nissan',
  'Mazda',
  'Ford',
  'BMW',
  'Mercedes-Benz',
  'Volkswagen',
  'Hyundai',
  'Kia',
];

const vehicleModels = [
  'Corolla',
  'Camry',
  'Civic',
  'Accord',
  'Sentra',
  'Altima',
  '3 Series',
  'C-Class',
  'Golf',
  'Elantra',
  'Rio',
  'Sportage',
];

const vehicleColors = [
  'White',
  'Black',
  'Silver',
  'Gray',
  'Blue',
  'Red',
  'Green',
  'Brown',
];

const notes = [
  'Vehicle broke down on the highway',
  'Engine overheating issue',
  'Battery died, need jump start',
  'Flat tire on the road',
  'Transmission problem',
  'Regular maintenance service',
  'Emergency roadside assistance needed',
  'Scheduled service appointment',
];

// Helper functions
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomNumber = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Generate random license plate (Malawi format: MW-XXXX)
const generateLicensePlate = (): string => {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const numbers = getRandomNumber(1000, 9999);
  const letter1 = getRandomElement(letters.split(''));
  const letter2 = getRandomElement(letters.split(''));
  return `MW-${letter1}${letter2}${numbers}`;
};

// Generate random date in the future (within next 30 days)
const generateFutureDate = (): Date => {
  const today = new Date();
  const daysToAdd = getRandomNumber(1, 30);
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + daysToAdd);
  return futureDate;
};

// Generate random date in the past (within last 30 days)
const generatePastDate = (): Date => {
  const today = new Date();
  const daysAgo = getRandomNumber(1, 30);
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - daysAgo);
  return pastDate;
};

// Generate towing services
function generateTowingServices(count: number, userIds: mongoose.Types.ObjectId[]) {
  const services = [];
  const statuses = Object.values(ServiceStatus);

  for (let i = 0; i < count; i++) {
    const pickupCity = getRandomElement(malawiCities);
    const destinationCity = getRandomElement(malawiCities.filter((city) => city !== pickupCity));
    const pickupLocation = `${pickupCity} City Centre`;
    const destination = `${destinationCity} City Centre`;
    const status = getRandomElement(statuses);
    const user = getRandomElement(userIds);

    // Price based on distance (simplified)
    const price = getRandomNumber(15000, 50000);

    // Payment status: completed if status is completed, pending otherwise
    const paymentStatus =
      status === ServiceStatus.COMPLETED
        ? getRandomElement(['pending', 'completed'])
        : 'pending';

    services.push({
      user,
      pickupLocation,
      destination,
      vehicleDetails: {
        make: getRandomElement(vehicleMakes),
        model: getRandomElement(vehicleModels),
        year: getRandomNumber(2010, 2024),
        licensePlate: generateLicensePlate(),
        color: getRandomElement(vehicleColors),
      },
      status,
      price,
      paymentStatus,
    });
  }

  return services;
}

// Generate car services
function generateCarServices(count: number, userIds: mongoose.Types.ObjectId[]) {
  const services = [];
  const serviceTypes = Object.values(ServiceType);
  const statuses = Object.values(ServiceStatus);

  for (let i = 0; i < count; i++) {
    const serviceType = getRandomElement(serviceTypes);
    const address = getRandomElement(malawiAddresses);
    const status = getRandomElement(statuses);
    const user = getRandomElement(userIds);

    // Price varies by service type
    let price: number;
    switch (serviceType) {
      case ServiceType.OIL_CHANGE:
        price = getRandomNumber(5000, 15000);
        break;
      case ServiceType.BRAKE_PADS:
        price = getRandomNumber(15000, 30000);
        break;
      case ServiceType.BATTERY:
        price = getRandomNumber(20000, 40000);
        break;
      case ServiceType.SPARK_PLUGS:
        price = getRandomNumber(8000, 18000);
        break;
      case ServiceType.AIR_FILTER:
        price = getRandomNumber(5000, 12000);
        break;
      case ServiceType.TIRE_ROTATION:
        price = getRandomNumber(5000, 10000);
        break;
      default:
        price = getRandomNumber(10000, 25000);
    }

    // Payment status: completed if status is completed, pending otherwise
    const paymentStatus =
      status === ServiceStatus.COMPLETED
        ? getRandomElement(['pending', 'completed'])
        : 'pending';

    // Preferred date: future date for pending/assigned, past date for completed/cancelled
    const preferredDate =
      status === ServiceStatus.COMPLETED || status === ServiceStatus.CANCELLED
        ? generatePastDate()
        : generateFutureDate();

    services.push({
      user,
      serviceType,
      address,
      preferredDate,
      vehicleDetails: {
        make: getRandomElement(vehicleMakes),
        model: getRandomElement(vehicleModels),
        year: getRandomNumber(2010, 2024),
        licensePlate: generateLicensePlate(),
      },
      status,
      price,
      paymentStatus,
      notes: getRandomElement(notes),
    });
  }

  return services;
}

// Seed function
async function seedServices() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autotek';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check existing services
    const existingTowingCount = await TowingService.countDocuments();
    const existingCarCount = await CarService.countDocuments();
    console.log(`📊 Found ${existingTowingCount} existing towing services`);
    console.log(`📊 Found ${existingCarCount} existing car services`);

    // Check if we should skip seeding
    const totalExisting = existingTowingCount + existingCarCount;
    if (totalExisting >= 30) {
      console.log(`✅ Already have ${totalExisting} services. Skipping seeding.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get users from database
    const users = await User.find().select('_id');
    if (users.length === 0) {
      console.error('❌ No users found in database. Please create users first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    const userIds = users.map((user) => user._id);
    console.log(`👥 Found ${userIds.length} users to assign services to`);

    // Generate services
    const towingCount = 18;
    const carCount = 18;
    console.log(`🌱 Generating ${towingCount} towing services...`);
    console.log(`🌱 Generating ${carCount} car services...`);

    const towingServices = generateTowingServices(towingCount, userIds);
    const carServices = generateCarServices(carCount, userIds);

    // Insert services
    await TowingService.insertMany(towingServices);
    console.log(`✅ Successfully created ${towingCount} towing services`);

    await CarService.insertMany(carServices);
    console.log(`✅ Successfully created ${carCount} car services`);

    // Show summary
    const totalTowing = await TowingService.countDocuments();
    const totalCar = await CarService.countDocuments();

    const towingByStatus = await TowingService.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const carByStatus = await CarService.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const carByType = await CarService.aggregate([
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    console.log('\n📊 Services Summary:');
    console.log(`Total Towing Services: ${totalTowing}`);
    console.log(`Total Car Services: ${totalCar}`);
    console.log(`Total Services: ${totalTowing + totalCar}`);

    console.log('\n📊 Towing Services by Status:');
    towingByStatus.forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });

    console.log('\n📊 Car Services by Status:');
    carByStatus.forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });

    console.log('\n📊 Car Services by Type:');
    carByType.forEach((type) => {
      console.log(`  ${type._id}: ${type.count}`);
    });

    console.log('\n✨ Seeding completed successfully!');
    console.log('\n💡 You can now test the admin services page!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding services:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run seed
seedServices();
