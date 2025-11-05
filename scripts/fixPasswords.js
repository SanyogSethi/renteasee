// Test admin login credentials
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../server/models/User');
require('dotenv').config();

async function testAdminLogin() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ email: 'admin@rentease.com' });
    
    if (!user) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    console.log('👤 User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Has password: ${!!user.password}`);
    console.log(`   Password length: ${user.password ? user.password.length : 0}\n`);

    // Test password comparison
    const match = await bcrypt.compare('admin123', user.password);
    console.log(`🔐 Password 'admin123' matches: ${match ? '✅ YES' : '❌ NO'}\n`);

    if (!match) {
      console.log('⚠️  Password mismatch detected!');
      console.log('🔄 Updating password...\n');
      
      // Re-hash and save password
      user.password = await bcrypt.hash('admin123', 10);
      await user.save();
      
      // Verify again
      const newMatch = await bcrypt.compare('admin123', user.password);
      console.log(`🔐 Password updated. New match: ${newMatch ? '✅ YES' : '❌ NO'}\n`);
    }

    // Test other users too
    console.log('🔍 Testing other users...\n');
    
    const owner = await User.findOne({ email: 'owner@rentease.com' });
    if (owner) {
      const ownerMatch = await bcrypt.compare('owner123', owner.password);
      console.log(`Owner password match: ${ownerMatch ? '✅' : '❌'}`);
      if (!ownerMatch) {
        owner.password = await bcrypt.hash('owner123', 10);
        await owner.save();
        console.log('   ✅ Owner password updated');
      }
    }

    const tenant = await User.findOne({ email: 'tenant@rentease.com' });
    if (tenant) {
      const tenantMatch = await bcrypt.compare('tenant123', tenant.password);
      console.log(`Tenant password match: ${tenantMatch ? '✅' : '❌'}`);
      if (!tenantMatch) {
        tenant.password = await bcrypt.hash('tenant123', 10);
        await tenant.save();
        console.log('   ✅ Tenant password updated');
      }
    }

    console.log('\n✅ All passwords verified/updated!');
    console.log('💡 Try logging in again now.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAdminLogin();

