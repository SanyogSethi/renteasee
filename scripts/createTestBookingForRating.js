const mongoose = require('mongoose');
const path = require('path');

// Set up paths
const User = require(path.join(__dirname, '../server/models/User'));
const Property = require(path.join(__dirname, '../server/models/Property'));
const Booking = require(path.join(__dirname, '../server/models/Booking'));
const Chat = require(path.join(__dirname, '../server/models/Chat'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentease', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestBookingForRating() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.once('open', () => {
      console.log('Connected to MongoDB');
    });

    // Get existing users
    const tenants = await User.find({ role: 'tenant' }).limit(5);
    const owners = await User.find({ role: 'owner' }).limit(5);

    if (tenants.length === 0 || owners.length === 0) {
      console.log('Not enough users found.');
      process.exit(1);
    }

    console.log(`Found ${tenants.length} tenants, ${owners.length} owners`);

    // Find an owner with a property
    let owner = null;
    let property = null;
    
    for (const o of owners) {
      const prop = await Property.findOne({
        owner: o._id,
        status: 'approved'
      });
      
      if (prop) {
        owner = o;
        property = prop;
        break;
      }
    }

    if (!owner || !property) {
      console.log('No owner with approved property found.');
      process.exit(1);
    }

    // Use first tenant
    const tenant = tenants[0];

    // Check if a completed booking without ratings already exists
    let booking = await Booking.findOne({
      tenant: tenant._id,
      owner: owner._id,
      property: property._id,
      status: 'completed',
      $or: [
        { tenantRating: null },
        { ownerRating: null }
      ]
    });

    if (booking) {
      console.log(`✅ Found existing completed booking without ratings:`);
      console.log(`   Booking ID: ${booking._id}`);
      console.log(`   Tenant: ${tenant.name}`);
      console.log(`   Owner: ${owner.name}`);
      console.log(`   Property: ${property.title}`);
      console.log(`   Period: ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}`);
      console.log(`   Tenant Rating: ${booking.tenantRating || 'Not rated'}`);
      console.log(`   Owner Rating: ${booking.ownerRating || 'Not rated'}`);
      console.log(`\n✅ You can now test rating functionality with this booking!`);
      process.exit(0);
    }

    // Create a chat if it doesn't exist
    let chat = await Chat.findOne({
      tenant: tenant._id,
      owner: owner._id,
      property: property._id
    });

    if (!chat) {
      chat = new Chat({
        tenant: tenant._id,
        owner: owner._id,
        property: property._id,
        messages: []
      });
      await chat.save();
    }

    // Create a completed booking with past dates (period has ended)
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 2); // 2 months ago
    const pastEndDate = new Date(pastDate);
    pastEndDate.setMonth(pastEndDate.getMonth() + 1); // 1 month booking, ended 1 month ago

    booking = new Booking({
      tenant: tenant._id,
      owner: owner._id,
      property: property._id,
      chat: chat._id,
      startDate: pastDate,
      endDate: pastEndDate,
      amount: property.price || 5000,
      status: 'completed',
      tenantRating: null,
      ownerRating: null
    });
    await booking.save();

    console.log(`\n✅ Created completed booking for testing ratings:`);
    console.log(`   Booking ID: ${booking._id}`);
    console.log(`   Tenant: ${tenant.name} (${tenant.email})`);
    console.log(`   Owner: ${owner.name} (${owner.email})`);
    console.log(`   Property: ${property.title}`);
    console.log(`   Period: ${pastDate.toLocaleDateString()} - ${pastEndDate.toLocaleDateString()}`);
    console.log(`   Status: completed`);
    console.log(`   Tenant Rating: Not rated`);
    console.log(`   Owner Rating: Not rated`);
    console.log(`\n📝 To test rating:`);
    console.log(`   1. Login as tenant: ${tenant.email}`);
    console.log(`   2. Go to Dashboard → Bookings → Past`);
    console.log(`   3. Click "Rate Owner" button`);
    console.log(`   4. Or login as owner: ${owner.email}`);
    console.log(`   5. Go to Dashboard → Bookings → Past`);
    console.log(`   6. Click "Rate Tenant" button`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestBookingForRating();

