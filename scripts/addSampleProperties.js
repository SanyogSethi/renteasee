// Script to add sample properties to MongoDB Atlas
// This will create properties with 'approved' status so they show on homepage

const mongoose = require('mongoose');
const Property = require('../server/models/Property');
const User = require('../server/models/User');
require('dotenv').config();

async function addSampleProperties() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('📍 Using URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide password
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find an owner user (or create one if needed)
    let owner = await User.findOne({ role: 'owner' });
    
    if (!owner) {
      console.log('⚠️  No owner found. Creating a sample owner...');
      owner = new User({
        name: 'Sample Owner',
        email: 'owner@example.com',
        password: 'hashedpassword', // You'll need to hash this properly
        role: 'owner',
        phone: '1234567890'
      });
      await owner.save();
      console.log('✅ Created sample owner');
    } else {
      console.log(`✅ Found owner: ${owner.name} (${owner.email})`);
    }

    // Sample properties with approved status
    const sampleProperties = [
      {
        owner: owner._id,
        title: 'Cozy PG Near Tech Park',
        description: 'A comfortable PG accommodation near the tech park with all modern amenities. Perfect for working professionals.',
        address: {
          fullAddress: '123 Main Street, Bangalore, Karnataka',
          city: 'Bangalore'
        },
        location: {
          latitude: 12.9716,
          longitude: 77.5946
        },
        price: 8000,
        capacity: 10,
        availableCapacity: 8,
        amenities: ['Wi-Fi', 'Laundry', 'Power Backup', 'Security'],
        rules: ['No smoking', 'No pets', 'Respect quiet hours'],
        images: ['uploads/properties/default.jpg'],
        amenitiesDetails: {
          foodAvailability: 'With food',
          wifi: 'Yes',
          ac: 'AC',
          laundry: 'Available',
          housekeeping: 'Daily',
          attachedBathroom: 'Yes',
          parking: 'For two-wheelers'
        },
        status: 'approved', // IMPORTANT: Set to approved so it shows on homepage
        isAvailable: true
      },
      {
        owner: owner._id,
        title: 'Modern Boys PG',
        description: 'Well-maintained PG with spacious rooms and excellent facilities. Located in a prime area.',
        address: {
          fullAddress: '456 Park Avenue, Delhi',
          city: 'Delhi'
        },
        location: {
          latitude: 28.6139,
          longitude: 77.2090
        },
        price: 12000,
        capacity: 15,
        availableCapacity: 12,
        amenities: ['Wi-Fi', 'TV', 'Gym', 'Cafeteria'],
        rules: ['No visitors after 10 PM', 'Cleanliness mandatory'],
        images: ['uploads/properties/default.jpg'],
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
        description: 'Budget-friendly PG with basic amenities. Great for students and entry-level professionals.',
        address: {
          fullAddress: '789 MG Road, Pune',
          city: 'Pune'
        },
        location: {
          latitude: 18.5204,
          longitude: 73.8567
        },
        price: 6000,
        capacity: 20,
        availableCapacity: 18,
        amenities: ['Wi-Fi', 'Common Area'],
        rules: ['Shared facilities', 'Monthly payment'],
        images: ['uploads/properties/default.jpg'],
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

    // Check if properties already exist
    const existingCount = await Property.countDocuments({ owner: owner._id });
    console.log(`\n📊 Existing properties count: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  Properties already exist. Skipping sample data creation.');
      console.log('💡 To add sample properties anyway, you can delete existing ones first.');
      process.exit(0);
    }

    // Insert sample properties
    const createdProperties = await Property.insertMany(sampleProperties);
    console.log(`\n✅ Created ${createdProperties.length} sample properties:`);
    createdProperties.forEach((prop, idx) => {
      console.log(`   ${idx + 1}. ${prop.title} - ₹${prop.price}/month - Status: ${prop.status}`);
    });

    console.log('\n🎉 Sample properties added successfully!');
    console.log('💡 Properties are set to "approved" status, so they will appear on the homepage.');
    console.log('🔗 Visit your homepage to see them!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding sample properties:', error);
    console.error('\n🔍 Error details:', error.message);
    if (error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your MongoDB Atlas username and password in MONGODB_URI');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Tip: Check your MongoDB Atlas connection string - network/URL might be incorrect');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Tip: MongoDB connection timeout - check network access in Atlas');
    }
    process.exit(1);
  }
}

addSampleProperties();

