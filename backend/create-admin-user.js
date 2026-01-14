// Script to create an admin user for testing
// Usage: node create-admin-user.js

const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  phone: String,
  role: String,
  address: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autotek';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@autotek.com' });
    if (existingAdmin) {
      console.log('Admin user already exists. Updating role...');
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Admin user updated successfully');
      console.log('Email: admin@autotek.com');
      console.log('Password: (use existing password or reset)');
      await mongoose.disconnect();
      return;
    }

    // Create new admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin123456', 10);

    const admin = new User({
      email: 'admin@autotek.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+265991111111',
      role: 'admin',
      address: 'Admin Address',
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@autotek.com');
    console.log('Password: Admin123456');
    console.log('\nYou can now login with these credentials to test admin endpoints.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
