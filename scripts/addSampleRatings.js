const mongoose = require('mongoose');
const path = require('path');

// Set up paths
const User = require(path.join(__dirname, '../server/models/User'));
const Property = require(path.join(__dirname, '../server/models/Property'));
const Booking = require(path.join(__dirname, '../server/models/Booking'));
const Chat = require(path.join(__dirname, '../server/models/Chat'));
const Rating = require(path.join(__dirname, '../server/models/Rating'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentease', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function addSampleRatings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.once('open', () => {
      console.log('Connected to MongoDB');
    });

    // Get existing users
    const tenants = await User.find({ role: 'tenant' }).limit(5);
    const owners = await User.find({ role: 'owner' }).limit(5);
    const properties = await Property.find({ status: 'approved' }).limit(5);

    if (tenants.length === 0 || owners.length === 0 || properties.length === 0) {
      console.log('Not enough users or properties found. Please ensure you have:');
      console.log('- At least 1 tenant');
      console.log('- At least 1 owner');
      console.log('- At least 1 approved property');
      process.exit(1);
    }

    console.log(`Found ${tenants.length} tenants, ${owners.length} owners, ${properties.length} properties`);

    // Create completed bookings and ratings
    const ratingsToCreate = [];
    let bookingCount = 0;

    // Pair tenants with owners who have properties
    for (let i = 0; i < tenants.length && bookingCount < 5; i++) {
      const tenant = tenants[i];
      
      // Find an owner who has a property
      for (const owner of owners) {
        if (bookingCount >= 5) break;
        
        // Find a property belonging to this owner
        const property = await Property.findOne({
          owner: owner._id,
          status: 'approved'
        });
        
        if (!property) {
          continue; // Skip this owner if they don't have properties
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
        console.log(`Created chat for tenant ${tenant.name} and owner ${owner.name}`);
      }

      // Create a completed booking
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2); // 2 months ago
      const pastEndDate = new Date(pastDate);
      pastEndDate.setMonth(pastEndDate.getMonth() + 1); // 1 month booking

      let booking = await Booking.findOne({
        tenant: tenant._id,
        owner: owner._id,
        property: property._id,
        status: 'completed'
      });

      if (!booking) {
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
        console.log(`Created completed booking for tenant ${tenant.name} and owner ${owner.name}`);
      }

      // Create ratings if they don't exist
      const existingTenantRating = await Rating.findOne({
        booking: booking._id,
        ratedBy: tenant._id
      });

      if (!existingTenantRating) {
        const ratings = [4, 5, 5, 4, 5]; // Mix of ratings
        const reviews = [
          `Great property! Owner ${owner.name} was very helpful and responsive. The place was clean and exactly as described. Highly recommended!`,
          `Excellent experience! The property matched the description perfectly. ${owner.name} was professional and accommodating.`,
          `Amazing stay! Clean, comfortable, and well-maintained. Owner was always available for any questions. 5 stars!`,
          `Good property overall. Some minor issues but owner was quick to resolve them. Would consider staying again.`,
          `Perfect accommodation! Everything was exactly as promised. ${owner.name} made the whole process smooth and easy.`
        ];
        
        const ratingValue = ratings[bookingCount % ratings.length];
        const reviewText = reviews[bookingCount % reviews.length];
        
        const tenantRating = new Rating({
          booking: booking._id,
          ratedBy: tenant._id,
          ratedTo: owner._id,
          rating: ratingValue,
          review: reviewText
        });
        await tenantRating.save();
        
        booking.ownerRating = tenantRating.rating;
        booking.ownerReview = tenantRating.review;
        await booking.save();
        
        ratingsToCreate.push(tenantRating);
        console.log(`Created tenant rating: ${tenantRating.rating} stars from ${tenant.name} to ${owner.name}`);
      }

      const existingOwnerRating = await Rating.findOne({
        booking: booking._id,
        ratedBy: owner._id
      });

      if (!existingOwnerRating) {
        const ratings = [5, 4, 5, 5, 4];
        const reviews = [
          `Tenant ${tenant.name} was excellent! Very respectful, paid on time, and kept the property clean. Would definitely rent to them again.`,
          `Good tenant overall. ${tenant.name} was responsible and took care of the property. No complaints.`,
          `Outstanding tenant! ${tenant.name} was communicative, respectful, and maintained the property perfectly. Highly recommend!`,
          `Great experience with ${tenant.name}. They were punctual, clean, and easy to work with. Would rent again.`,
          `Professional tenant. ${tenant.name} followed all rules and left the property in excellent condition.`
        ];
        
        const ratingValue = ratings[bookingCount % ratings.length];
        const reviewText = reviews[bookingCount % reviews.length];
        
        const ownerRating = new Rating({
          booking: booking._id,
          ratedBy: owner._id,
          ratedTo: tenant._id,
          rating: ratingValue,
          review: reviewText
        });
        await ownerRating.save();
        
        booking.tenantRating = ownerRating.rating;
        booking.tenantReview = ownerRating.review;
        await booking.save();
        
        ratingsToCreate.push(ownerRating);
        console.log(`Created owner rating: ${ownerRating.rating} stars from ${owner.name} to ${tenant.name}`);
      }
      
      bookingCount++;
      
      if (bookingCount >= 5) break; // Limit to 5 bookings
      }
      
      if (bookingCount >= 5) break; // Limit to 5 bookings
    }

    console.log(`\n✅ Successfully created ${ratingsToCreate.length} ratings!`);
    console.log('\nSample ratings have been added. You can now:');
    console.log('- View ratings in the Admin Dashboard');
    console.log('- View ratings in Tenant/Owner dashboards');
    console.log('- Test rating functionality');

    process.exit(0);
  } catch (error) {
    console.error('Error adding sample ratings:', error);
    process.exit(1);
  }
}

addSampleRatings();
