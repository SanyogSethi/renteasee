const mongoose = require('mongoose');
const Chat = require('../server/models/Chat');
const Image = require('../server/models/Image');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

async function migrateChatImagesToMongoDB() {
  try {
    // Connect to MongoDB - use production URI if available
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    const maskedUri = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔌 Connecting to MongoDB:', maskedUri);
    
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
      
      // Check if default property image exists in MongoDB (preferred)
      let existingStockImage = await Image.findOne({ filename: 'default-property-image.jpg' });
      if (!existingStockImage) {
        // Fallback to stock-image.jpg if default-property-image doesn't exist
        existingStockImage = await Image.findOne({ filename: 'stock-image.jpg' });
      }
      
      if (!existingStockImage) {
        console.log('💾 Creating default image in MongoDB...');
        const stockImage = new Image({
          filename: 'default-property-image.jpg',
          mimetype: 'image/jpeg',
          data: imageBuffer,
          size: imageStats.size
        });
        await stockImage.save();
        stockImageId = stockImage._id.toString();
        console.log('✅ Created default image:', stockImageId);
      } else {
        stockImageId = existingStockImage._id.toString();
        console.log('✅ Using existing default image:', stockImageId);
      }
    } else {
      console.log('⚠️  Stock image file not found, checking MongoDB...');
      const existingStockImage = await Image.findOne({ filename: 'default-property-image.jpg' });
      if (!existingStockImage) {
        const fallbackStockImage = await Image.findOne({ filename: 'stock-image.jpg' });
        if (fallbackStockImage) {
          stockImageId = fallbackStockImage._id.toString();
          console.log('✅ Found stock image in MongoDB:', stockImageId);
        } else {
          console.error('❌ No default image found in MongoDB!');
          console.log('   Please run scripts/replaceLogoWithDefaultImage.js first');
          process.exit(1);
        }
      } else {
        stockImageId = existingStockImage._id.toString();
        console.log('✅ Found default image in MongoDB:', stockImageId);
      }
    }

    // Find all chats with messages that have imageUrl
    // Also find chats where imageUrl might be in different formats
    const chats = await Chat.find({ 
      $or: [
        { 'messages.imageUrl': { $exists: true, $ne: null } },
        { 'messages.imageUrl': { $regex: /chat-|uploads|\.png|\.jpg|\.jpeg/i } }
      ]
    });
    console.log(`\n📋 Found ${chats.length} chats (checking for image messages)\n`);

    let updatedChats = 0;
    let updatedMessages = 0;
    let skippedMessages = 0;
    let totalMessagesChecked = 0;

    for (const chat of chats) {
      let chatUpdated = false;
      
      if (!chat.messages || chat.messages.length === 0) continue;
      
      for (const message of chat.messages) {
        if (!message.imageUrl) continue;
        
        totalMessagesChecked++;

        // Check if it's already a MongoDB ObjectId
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        if (objectIdPattern.test(message.imageUrl)) {
          // Verify it exists in MongoDB
          const imageExists = await Image.findById(message.imageUrl);
          if (imageExists) {
            skippedMessages++;
            continue;
          } else {
            // ObjectId exists but image doesn't - replace with stock image
            console.log(`⚠️  Image ${message.imageUrl} not found, replacing with stock image`);
            message.imageUrl = stockImageId;
            chatUpdated = true;
            updatedMessages++;
            continue;
          }
        }

        // It's a path-based image - replace with stock image
        // Check for various path patterns
        if (message.imageUrl.startsWith('uploads/') || 
            message.imageUrl.includes('/chats/') || 
            message.imageUrl.includes('/uploads/') ||
            message.imageUrl.includes('chat-') ||
            message.imageUrl.endsWith('.png') ||
            message.imageUrl.endsWith('.jpg') ||
            message.imageUrl.endsWith('.jpeg') ||
            message.imageUrl.includes('/')) {
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
    console.log(`   📋 Total chats checked: ${chats.length}`);
    console.log(`   💬 Total messages checked: ${totalMessagesChecked}`);
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

