const mongoose = require('mongoose');
const Chat = require('../server/models/Chat');
const Booking = require('../server/models/Booking');
require('dotenv').config({ path: '../.env' });

async function clearDatabase() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Delete all chats
    const chatResult = await Chat.deleteMany({});
    console.log(`\n✅ Deleted ${chatResult.deletedCount} chats`);

    // Delete all bookings
    const bookingResult = await Booking.deleteMany({});
    console.log(`✅ Deleted ${bookingResult.deletedCount} bookings`);

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('Chats and bookings have been removed from the database.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();

