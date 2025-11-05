const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Property = require('../models/Property');

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentease';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

async function clearExisting() {
  await Property.deleteMany({});
  await User.deleteMany({});
  console.log('Cleared existing users and properties');
}

async function seed() {
  await connectDb();
  await clearExisting();

  // Create users
  const admin = new User({
    name: 'Admin User',
    email: 'admin@rentease.com',
    password: 'Admin@123',
    phone: '9999999999',
    role: 'admin',
    isVerified: true
  });

  const owner = new User({
    name: 'Olivia Owner',
    email: 'owner@rentease.com',
    password: 'Owner@123',
    phone: '8888888888',
    role: 'owner',
    isVerified: true
  });

  const tenant = new User({
    name: 'Tom Tenant',
    email: 'tenant@rentease.com',
    password: 'Tenant@123',
    phone: '7777777777',
    role: 'tenant',
    isVerified: true
  });

  await admin.save();
  await owner.save();
  await tenant.save();
  console.log('Created users: admin, owner, tenant');

  // Copy stock image to properties folder if it doesn't exist
  const fs = require('fs');
  const stockImageSource = path.join(__dirname, '../../client/public/ -2.jpg');
  const stockImageDest = path.join(__dirname, '../../uploads/properties/stock-image.jpg');
  
  try {
    if (fs.existsSync(stockImageSource)) {
      // Ensure uploads/properties directory exists
      const propertiesDir = path.dirname(stockImageDest);
      if (!fs.existsSync(propertiesDir)) {
        fs.mkdirSync(propertiesDir, { recursive: true });
      }
      // Copy stock image
      fs.copyFileSync(stockImageSource, stockImageDest);
      console.log('Stock image copied to uploads/properties/');
    }
  } catch (error) {
    console.log('Note: Could not copy stock image, using path reference:', error.message);
  }

  // Create properties for owner
  const stockImagePath = 'uploads/properties/stock-image.jpg';
  const propertiesData = [
    {
      owner: owner._id,
      title: 'Cozy PG near City Center',
      description: 'Fully furnished PG with WiFi, AC, and housekeeping. Close to metro station and market.',
      address: { fullAddress: '12, Central Avenue, City Center' },
      price: 12000,
      capacity: 4,
      availableCapacity: 3,
      amenities: ['WiFi', 'Air Conditioning', 'Housekeeping', 'Laundry'],
      rules: ['No smoking', 'No pets', 'No loud music after 10pm'],
      images: [stockImagePath]
    },
    {
      owner: owner._id,
      title: 'Spacious PG for Students',
      description: 'Quiet neighborhood, study-friendly environment. Includes meals and 24/7 water supply.',
      address: { fullAddress: '45, Green Lane, University Area' },
      price: 9000,
      capacity: 6,
      availableCapacity: 4,
      amenities: ['Meals', '24/7 Water', 'CCTV', 'Power Backup'],
      rules: ['No alcohol', 'Visitors with permission only'],
      images: [stockImagePath]
    },
    {
      owner: owner._id,
      title: 'Premium PG with Balcony',
      description: 'Modern interiors, balcony view, high-speed internet, and gym access.',
      address: { fullAddress: '89, Lake View Road, West End' },
      price: 15000,
      capacity: 3,
      availableCapacity: 2,
      amenities: ['High-speed Internet', 'Gym Access', 'Balcony', 'Parking'],
      rules: ['No parties', 'Maintain cleanliness'],
      images: [stockImagePath]
    }
  ];

  const properties = await Property.insertMany(propertiesData);
  console.log(`Created ${properties.length} properties for owner`);

  console.log('Seeding complete');
}

seed()
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error('Seeding error:', err);
    mongoose.disconnect();
    process.exit(1);
  });



