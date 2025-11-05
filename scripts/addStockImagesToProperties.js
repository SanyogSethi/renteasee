const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Property = require('../server/models/Property');
const Image = require('../server/models/Image');
require('dotenv').config({ path: '../.env' });

async function addStockImagesToProperties() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Read the stock image file
    let stockImagePath = path.join(__dirname, '../assets/-2.jpg');
    
    if (!fs.existsSync(stockImagePath)) {
      console.log('⚠️  Stock image not found at:', stockImagePath);
      console.log('Looking for alternative locations...');
      
      // Try alternative paths
      const altPaths = [
        path.join(__dirname, '../assets/RENTEASE.jpg'),
        path.join(__dirname, '../client/public/-2.jpg'),
        path.join(__dirname, '../client/src/assets/-2.jpg')
      ];
      
      let foundPath = null;
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          break;
        }
      }
      
      if (!foundPath) {
        console.error('❌ Could not find stock image file');
        console.log('Available files in assets:');
        try {
          const assetsDir = path.join(__dirname, '../assets');
          if (fs.existsSync(assetsDir)) {
            const files = fs.readdirSync(assetsDir);
            files.forEach(f => console.log(`   - ${f}`));
          }
        } catch (e) {
          console.log('   Could not list assets directory');
        }
        process.exit(1);
      }
      
      stockImagePath = foundPath;
      console.log('✅ Found stock image at:', stockImagePath);
    }

    const imageBuffer = fs.readFileSync(stockImagePath);
    const imageStats = fs.statSync(stockImagePath);
    
    console.log('📁 Stock image info:');
    console.log(`   Path: ${stockImagePath}`);
    console.log(`   Size: ${imageStats.size} bytes`);
    console.log(`   Format: ${path.extname(stockImagePath)}\n`);

    // Create Image document in MongoDB
    console.log('💾 Creating Image document in MongoDB...');
    const stockImage = new Image({
      filename: 'stock-image.jpg',
      mimetype: 'image/jpeg',
      data: imageBuffer,
      size: imageStats.size
    });

    await stockImage.save();
    const stockImageId = stockImage._id.toString();
    console.log(`✅ Stock image saved to MongoDB with ID: ${stockImageId}\n`);

    // Get all properties
    const properties = await Property.find({});
    console.log(`📋 Found ${properties.length} properties\n`);

    if (properties.length === 0) {
      console.log('⚠️  No properties found in database');
      console.log('   Run scripts/setupInitialData.js first to create sample properties');
      process.exit(0);
    }

    // Update properties that don't have images or have empty images array
    let updatedCount = 0;
    let skippedCount = 0;
    let replacedCount = 0;

    for (const property of properties) {
      // Check if property already has images
      const hasImages = property.images && property.images.length > 0;
      
      if (!hasImages) {
        // No images - add stock image
        property.images = [stockImageId];
        await property.save();
        console.log(`✅ Added stock image to "${property.title}" (${property._id})`);
        updatedCount++;
        continue;
      }

      // Check if images are MongoDB IDs or legacy paths
      const hasMongoDBImages = property.images.some(img => {
        // Check if it's a MongoDB ObjectId (24 hex chars)
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        return objectIdPattern.test(img);
      });
      
      const hasPathImages = property.images.some(img => {
        return img.startsWith('uploads/') || img.includes('/');
      });

      if (hasMongoDBImages) {
        // Already has MongoDB images - skip
        console.log(`⏭️  Skipping "${property.title}" - already has MongoDB image(s)`);
        skippedCount++;
      } else if (hasPathImages) {
        // Has legacy path-based images - replace with MongoDB stock image
        property.images = [stockImageId];
        await property.save();
        console.log(`🔄 Replaced path-based images with MongoDB stock image for "${property.title}" (${property._id})`);
        replacedCount++;
      } else {
        // Empty or invalid images array - add stock image
        property.images = [stockImageId];
        await property.save();
        console.log(`✅ Added stock image to "${property.title}" (${property._id})`);
        updatedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${updatedCount} properties`);
    console.log(`   🔄 Replaced: ${replacedCount} properties (path-based → MongoDB)`);
    console.log(`   ⏭️  Skipped: ${skippedCount} properties (already have MongoDB images)`);
    console.log(`   💾 Stock image ID: ${stockImageId}`);

    console.log('\n🎉 Done! Properties now have stock images.');
    console.log('   New uploads will use MongoDB storage.');
    console.log('   Existing properties with paths will still work.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addStockImagesToProperties();

