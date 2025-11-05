const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Image = require('../server/models/Image');
const Property = require('../server/models/Property');

// Load environment variables - try both locations
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

async function addImagesToProductionDB() {
  try {
    // Get MongoDB URI from environment (production)
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in environment variables!');
      console.log('Please set MONGODB_URI in your .env file or environment');
      process.exit(1);
    }

    // Mask credentials for logging
    const maskedUri = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔌 Connecting to MongoDB Atlas:', maskedUri);
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Read stock image
    let stockImagePath = path.join(__dirname, '../assets/RENTEASE.jpg');
    if (!fs.existsSync(stockImagePath)) {
      stockImagePath = path.join(__dirname, '../assets/-2.jpg');
    }
    
    if (!fs.existsSync(stockImagePath)) {
      console.error('❌ Stock image not found!');
      process.exit(1);
    }

    const imageBuffer = fs.readFileSync(stockImagePath);
    const imageStats = fs.statSync(stockImagePath);
    
    console.log('📁 Stock image:', {
      path: stockImagePath,
      size: imageStats.size,
      format: path.extname(stockImagePath)
    });

    // Check if stock image already exists
    let stockImage = await Image.findOne({ filename: 'stock-image.jpg' });
    
    if (!stockImage) {
      console.log('\n💾 Creating stock image in MongoDB Atlas...');
      stockImage = new Image({
        filename: 'stock-image.jpg',
        mimetype: 'image/jpeg',
        data: imageBuffer,
        size: imageStats.size
      });
      await stockImage.save();
      console.log(`✅ Created stock image: ${stockImage._id}`);
    } else {
      console.log(`\n✅ Stock image already exists: ${stockImage._id}`);
    }

    const stockImageId = stockImage._id.toString();

    // Get all properties
    const properties = await Property.find({});
    console.log(`\n📋 Found ${properties.length} properties\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const property of properties) {
      // Check if property has images
      if (property.images && property.images.length > 0) {
        // Check if images are MongoDB ObjectIds
        const hasObjectIds = property.images.some(img => {
          const objectIdPattern = /^[0-9a-fA-F]{24}$/;
          return objectIdPattern.test(img);
        });

        if (hasObjectIds) {
          // Verify images exist
          let allExist = true;
          for (const imgId of property.images) {
            const exists = await Image.findById(imgId);
            if (!exists) {
              allExist = false;
              break;
            }
          }

          if (allExist) {
            console.log(`⏭️  Skipping "${property.title}" - has valid images`);
            skippedCount++;
            continue;
          }
        }
      }

      // Add/update stock image
      property.images = [stockImageId];
      await property.save();
      console.log(`✅ Updated "${property.title}" with stock image`);
      updatedCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updatedCount} properties`);
    console.log(`   ⏭️  Skipped: ${skippedCount} properties`);
    console.log(`   💾 Stock image ID: ${stockImageId}`);
    console.log('\n🎉 Done! Properties in production DB now have images.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addImagesToProductionDB();

