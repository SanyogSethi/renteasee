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

async function checkAndCreateTestBooking() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.once('open', () => {
      console.log('Connected to MongoDB');
    });

    // Get existing users
    const tenants = await User.find({ role: 'tenant' }).limit(3);
    const owners = await User.find({ role: 'owner' }).limit(3);
    const properties = await Property.find({ status: 'approved' }).limit(5);

    if (tenants.length === 0 || owners.length === 0 || properties.length === 0) {
      console.log('Not enough users or properties found.');
      process.exit(1);
    }

    console.log(`Found ${tenants.length} tenants, ${owners.length} owners, ${properties.length} properties`);

    // Check for existing completed bookings without ratings
    let bookingCount = 0;
    let createdCount = 0;

    for (const tenant of tenants) {
      if (bookingCount >= 3) break;
      
      for (const owner of owners) {
        if (bookingCount >= 3) break;
        
        // Find a property belonging to this owner
        const property = await Property.findOne({
          owner: owner._id,
          status: 'approved'
        });
        
        if (!property) continue;

        // Check if booking already exists
        let booking = await Booking.findOne({
          tenant: tenant._id,
          owner: owner._id,
          property: property._id,
          status: 'completed'
        });

        if (!booking) {
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

          // Create a completed booking with past dates (ended period)
          const pastDate = new Date();
          pastDate.setMonth(pastDate.getMonth() - 3); // 3 months ago
          const pastEndDate = new Date(pastDate);
          pastEndDate.setMonth(pastEndDate.getMonth() + 2); // 2 month booking, ended 1 month ago

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
          createdCount++;
          console.log(`✅ Created completed booking:`);
          console.log(`   Tenant: ${tenant.name}`);
          console.log(`   Owner: ${owner.name}`);
          console.log(`   Property: ${property.title}`);
          console.log(`   Period: ${pastDate.toLocaleDateString()} - ${pastEndDate.toLocaleDateString()}`);
          console.log(`   Status: completed (ready for rating)\n`);
        } else {
          console.log(`ℹ️  Booking already exists:`);
          console.log(`   Tenant: ${tenant.name}`);
          console.log(`   Owner: ${owner.name}`);
          console.log(`   Property: ${property.title}`);
          console.log(`   Status: ${booking.status}`);
          console.log(`   Tenant Rating: ${booking.tenantRating || 'Not rated'}`);
          console.log(`   Owner Rating: ${booking.ownerRating || 'Not rated'}\n`);
        }
        
        bookingCount++;
      }
    }

    // List all completed bookings that can be rated
    console.log('\n=== Completed Bookings Available for Rating ===');
    const completedBookings = await Booking.find({ status: 'completed' })
      .populate('tenant', 'name email')
      .populate('owner', 'name email')
      .populate('property', 'title')
      .sort({ endDate: -1 });

    if (completedBookings.length === 0) {
      console.log('No completed bookings found.');
    } else {
      completedBookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking._id}`);
        console.log(`   Tenant: ${booking.tenant.name} (${booking.tenant.email})`);
        console.log(`   Owner: ${booking.owner.name} (${booking.owner.email})`);
        console.log(`   Property: ${booking.property.title}`);
        console.log(`   Period: ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}`);
        console.log(`   Amount: ₹${booking.amount}`);
        console.log(`   Tenant Rating: ${booking.tenantRating || 'Not rated yet'}`);
        console.log(`   Owner Rating: ${booking.ownerRating || 'Not rated yet'}`);
        console.log(`   ✅ Can be rated: YES`);
      });
    }

    console.log(`\n✅ Total completed bookings: ${completedBookings.length}`);
    console.log(`   Created ${createdCount} new completed bookings\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndCreateTestBooking();

