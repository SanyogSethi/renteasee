// Test MongoDB connection
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    console.log('🔌 Testing MongoDB connection...');
    console.log('📍 Connection string:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide password
    
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connection successful!');
    
    // Check if we can access the database
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Check Property collection
    const Property = require('../server/models/Property');
    const propertyCount = await Property.countDocuments();
    console.log(`\n🏠 Properties in database: ${propertyCount}`);
    
    // Check User collection
    const User = require('../server/models/User');
    const userCount = await User.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    const ownerCount = await User.countDocuments({ role: 'owner' });
    console.log(`   - Owners: ${ownerCount}`);
    
    const tenantCount = await User.countDocuments({ role: 'tenant' });
    console.log(`   - Tenants: ${tenantCount}`);
    
    const adminCount = await User.countDocuments({ role: 'admin' });
    console.log(`   - Admins: ${adminCount}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n💡 Issue: Authentication failed');
      console.error('   → Check your MongoDB Atlas username and password');
      console.error('   → Verify the connection string in your .env file');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Issue: Cannot resolve hostname');
      console.error('   → Check your MongoDB Atlas connection string');
      console.error('   → Verify network access in Atlas dashboard');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Issue: Connection timeout');
      console.error('   → Check your IP is whitelisted in MongoDB Atlas');
      console.error('   → Verify network access settings');
    } else if (error.message.includes('ENV')) {
      console.error('\n💡 Issue: Environment variable not found');
      console.error('   → Make sure MONGODB_URI is set in your .env file');
      console.error('   → Or set it as an environment variable');
    }
    
    process.exit(1);
  }
}

testConnection();

