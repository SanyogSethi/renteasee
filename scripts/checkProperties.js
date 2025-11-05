const mongoose = require('mongoose');
const Property = require('../server/models/Property');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

async function checkProperties() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    const maskedUri = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔌 Connecting to:', maskedUri);
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected\n');

    const properties = await Property.find({});
    console.log(`📊 Total properties in database: ${properties.length}\n`);

    if (properties.length === 0) {
      console.log('❌ No properties found in database!');
      process.exit(1);
    }

    properties.forEach(prop => {
      console.log(`\n🏠 ${prop.title}`);
      console.log(`   Status: ${prop.status || '(no status)'}`);
      console.log(`   Is Available: ${prop.isAvailable}`);
      console.log(`   Owner: ${prop.owner}`);
      console.log(`   Price: ₹${prop.price}/month`);
      console.log(`   Capacity: ${prop.availableCapacity}/${prop.capacity}`);
    });

    // Check which properties would show on homepage
    const homepageFilter = {
      isAvailable: true,
      $or: [
        { status: 'approved' },
        { status: { $exists: false } }
      ]
    };

    const visibleProperties = await Property.find(homepageFilter);
    console.log(`\n\n📋 Properties visible on homepage: ${visibleProperties.length}`);
    
    if (visibleProperties.length === 0) {
      console.log('\n⚠️  WHY PROPERTIES ARE NOT VISIBLE:');
      const unavailable = await Property.find({ isAvailable: false });
      const pending = await Property.find({ status: 'pending' });
      const rejected = await Property.find({ status: 'rejected' });
      
      console.log(`   - Unavailable (isAvailable: false): ${unavailable.length}`);
      console.log(`   - Pending approval: ${pending.length}`);
      console.log(`   - Rejected: ${rejected.length}`);
      
      if (pending.length > 0) {
        console.log('\n💡 SOLUTION: Properties are pending approval. Approve them in admin panel.');
      }
      if (unavailable.length > 0) {
        console.log('\n💡 SOLUTION: Properties have isAvailable: false. Set to true.');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkProperties();

