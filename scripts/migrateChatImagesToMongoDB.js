const mongoose = require('mongoose');
const Chat = require('../server/models/Chat');
const Image = require('../server/models/Image');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

async function migrateChatImagesToMongoDB() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Read stock image for fallback
    let stockImagePath = path.join(__dirname, '../assets/RENTEASE.jpg');
    if (!fs.existsSync(stockImagePath)) {
      stockImagePath = path.join(__dirname, '../assets/-2.jpg');
    }
    
    let stockImageId = null;
    if (fs.existsSync(stockImagePath)) {
      const imageBuffer = fs.readFileSync(stockImagePath);
      const imageStats = fs.statSync(stockImagePath);
      
      // Check if stock image already exists in MongoDB
      let existingStockImage = await Image.findOne({ filename: 'stock-image.jpg' });
      if (!existingStockImage) {
        const stockImage = new Image({
          filename: 'stock-image.jpg',
          mimetype: 'image/jpeg',
          data: imageBuffer,
          size: imageStats.size
        });
        await stockImage.save();
        stockImageId = stockImage._id.toString();
        console.log('✅ Created stock image in MongoDB:', stockImageId);
      } else {
        stockImageId = existingStockImage._id.toString();
        console.log('✅ Using existing stock image:', stockImageId);
      }
    }

    // Find all chats with messages that have imageUrl
    const chats = await Chat.find({ 'messages.imageUrl': { $exists: true, $ne: null } });
    console.log(`\n📋 Found ${chats.length} chats with image messages\n`);

    let updatedChats = 0;
    let updatedMessages = 0;
    let skippedMessages = 0;

    for (const chat of chats) {
      let chatUpdated = false;
      
      for (const message of chat.messages) {
        if (!message.imageUrl) continue;

        // Check if it's already a MongoDB ObjectId
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        if (objectIdPattern.test(message.imageUrl)) {
          skippedMessages++;
          continue;
        }

        // It's a path-based image - replace with stock image
        if (message.imageUrl.startsWith('uploads/') || message.imageUrl.includes('/')) {
          console.log(`🔄 Updating message ${message._id}: "${message.imageUrl}" → MongoDB stock image`);
          
          if (stockImageId) {
            message.imageUrl = stockImageId;
            chatUpdated = true;
            updatedMessages++;
          } else {
            console.log('⚠️  No stock image available, removing imageUrl');
            message.imageUrl = null;
            message.type = 'text';
            chatUpdated = true;
            updatedMessages++;
          }
        }
      }

      if (chatUpdated) {
        await chat.save();
        updatedChats++;
        console.log(`✅ Updated chat: ${chat._id}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated chats: ${updatedChats}`);
    console.log(`   🔄 Updated messages: ${updatedMessages}`);
    console.log(`   ⏭️  Skipped messages: ${skippedMessages} (already MongoDB IDs)`);
    
    if (stockImageId) {
      console.log(`   💾 Stock image ID: ${stockImageId}`);
    }

    console.log('\n🎉 Migration completed!');
    console.log('   All chat images now use MongoDB storage.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateChatImagesToMongoDB();

