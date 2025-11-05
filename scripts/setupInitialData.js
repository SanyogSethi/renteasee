// Setup script to create admin user and sample properties
// This bypasses document verification for initial setup

const mongoose = require('mongoose');
const User = require('../server/models/User');
const Property = require('../server/models/Property');
require('dotenv').config();

async function setupInitialData() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Create Admin User
    console.log('👤 Creating admin user...');
    let admin = await User.findOne({ email: 'admin@rentease.com' });
    
    if (!admin) {
      // Don't hash password - User model will hash it automatically on save
      admin = new User({
        name: 'Admin User',
        email: 'admin@rentease.com',
        password: 'admin123', // User model will hash this automatically
        role: 'admin',
        phone: '9999999999',
        isVerified: true
      });
      await admin.save();
      console.log('✅ Admin created:');
      console.log('   Email: admin@rentease.com');
      console.log('   Password: admin123\n');
    } else {
      console.log('⚠️  Admin already exists');
      // Update password if it doesn't match
      const match = await admin.comparePassword('admin123');
      if (!match) {
        admin.password = 'admin123'; // Will be hashed on save
        await admin.save();
        console.log('   ✅ Admin password updated\n');
      } else {
        console.log('   ✅ Admin password OK\n');
      }
    }

    // Create Owner User
    console.log('👤 Creating owner user...');
    let owner = await User.findOne({ email: 'owner@rentease.com' });
    
    if (!owner) {
      // Don't hash password - User model will hash it automatically on save
      owner = new User({
        name: 'Sample Owner',
        email: 'owner@rentease.com',
        password: 'owner123', // User model will hash this automatically
        role: 'owner',
        phone: '8888888888',
        isVerified: true
      });
      await owner.save();
      console.log('✅ Owner created:');
      console.log('   Email: owner@rentease.com');
      console.log('   Password: owner123\n');
    } else {
      console.log('⚠️  Owner already exists');
      // Update password if it doesn't match
      const match = await owner.comparePassword('owner123');
      if (!match) {
        owner.password = 'owner123'; // Will be hashed on save
        await owner.save();
        console.log('   ✅ Owner password updated\n');
      } else {
        console.log('   ✅ Owner password OK\n');
      }
    }

    // Create Tenant User
    console.log('👤 Creating tenant user...');
    let tenant = await User.findOne({ email: 'tenant@rentease.com' });
    
    if (!tenant) {
      // Don't hash password - User model will hash it automatically on save
      tenant = new User({
        name: 'Sample Tenant',
        email: 'tenant@rentease.com',
        password: 'tenant123', // User model will hash this automatically
        role: 'tenant',
        phone: '7777777777',
        isVerified: true
      });
      await tenant.save();
      console.log('✅ Tenant created:');
      console.log('   Email: tenant@rentease.com');
      console.log('   Password: tenant123\n');
    } else {
      console.log('⚠️  Tenant already exists');
      // Update password if it doesn't match
      const match = await tenant.comparePassword('tenant123');
      if (!match) {
        tenant.password = 'tenant123'; // Will be hashed on save
        await tenant.save();
        console.log('   ✅ Tenant password updated\n');
      } else {
        console.log('   ✅ Tenant password OK\n');
      }
    }

    // Create Sample Properties (Approved)
    console.log('🏠 Creating sample properties...');
    const existingProperties = await Property.countDocuments({ owner: owner._id });
    
    if (existingProperties === 0) {
      const sampleProperties = [
        {
          owner: owner._id,
          title: 'Cozy PG Near Tech Park',
          description: 'A comfortable PG accommodation near the tech park with all modern amenities. Perfect for working professionals. Spacious rooms with attached bathrooms and daily housekeeping.',
          address: {
            fullAddress: '123 Main Street, Koramangala, Bangalore, Karnataka 560095',
            city: 'Bangalore'
          },
          location: {
            latitude: 12.9716,
            longitude: 77.5946
          },
          price: 8000,
          capacity: 10,
          availableCapacity: 8,
          amenities: ['Wi-Fi', 'Laundry', 'Power Backup', 'Security', '24/7 Water Supply'],
          rules: ['No smoking', 'No pets', 'Respect quiet hours', 'No outside visitors after 10 PM'],
          images: [],
          amenitiesDetails: {
            foodAvailability: 'With food',
            wifi: 'Yes',
            ac: 'AC',
            laundry: 'Available',
            housekeeping: 'Daily',
            attachedBathroom: 'Yes',
            parking: 'For two-wheelers'
          },
          status: 'approved',
          isAvailable: true
        },
        {
          owner: owner._id,
          title: 'Modern Boys PG',
          description: 'Well-maintained PG with spacious rooms and excellent facilities. Located in a prime area with easy access to metro and bus stops. Includes gym and cafeteria.',
          address: {
            fullAddress: '456 Park Avenue, Connaught Place, New Delhi, Delhi 110001',
            city: 'Delhi'
          },
          location: {
            latitude: 28.6139,
            longitude: 77.2090
          },
          price: 12000,
          capacity: 15,
          availableCapacity: 12,
          amenities: ['Wi-Fi', 'TV', 'Gym', 'Cafeteria', 'Recreation Room'],
          rules: ['No visitors after 10 PM', 'Cleanliness mandatory', 'No cooking in rooms'],
          images: [],
          amenitiesDetails: {
            foodAvailability: 'With food',
            wifi: 'Yes',
            ac: 'AC',
            laundry: 'Available',
            housekeeping: 'Weekly',
            attachedBathroom: 'No',
            parking: 'For four-wheelers'
          },
          status: 'approved',
          isAvailable: true
        },
        {
          owner: owner._id,
          title: 'Affordable PG Accommodation',
          description: 'Budget-friendly PG with basic amenities. Great for students and entry-level professionals. Clean and safe environment with shared facilities.',
          address: {
            fullAddress: '789 MG Road, Koregaon Park, Pune, Maharashtra 411001',
            city: 'Pune'
          },
          location: {
            latitude: 18.5204,
            longitude: 73.8567
          },
          price: 6000,
          capacity: 20,
          availableCapacity: 18,
          amenities: ['Wi-Fi', 'Common Area', 'Study Room'],
          rules: ['Shared facilities', 'Monthly payment', 'No late-night entry'],
          images: [],
          amenitiesDetails: {
            foodAvailability: 'Without food',
            wifi: 'Yes',
            ac: 'Non-AC',
            laundry: 'Not available',
            housekeeping: 'None',
            attachedBathroom: 'No',
            parking: 'None'
          },
          status: 'approved',
          isAvailable: true
        }
      ];

      const createdProperties = await Property.insertMany(sampleProperties);
      console.log(`✅ Created ${createdProperties.length} sample properties:\n`);
      createdProperties.forEach((prop, idx) => {
        console.log(`   ${idx + 1}. ${prop.title}`);
        console.log(`      Location: ${prop.address.city}`);
        console.log(`      Price: ₹${prop.price}/month`);
        console.log(`      Status: ${prop.status}\n`);
      });
    } else {
      console.log(`⚠️  ${existingProperties} properties already exist\n`);
    }

    console.log('🎉 Setup completed successfully!\n');
    console.log('📋 Test Accounts:');
    console.log('   Admin:  admin@rentease.com / admin123');
    console.log('   Owner:  owner@rentease.com / owner123');
    console.log('   Tenant: tenant@rentease.com / tenant123\n');
    console.log('💡 Properties are set to "approved" status and will appear on the homepage.');
    console.log('🔗 Visit your homepage to see them!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up data:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

setupInitialData();

