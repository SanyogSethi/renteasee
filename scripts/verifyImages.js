const mongoose = require('mongoose');
const Image = require('../server/models/Image');
const Property = require('../server/models/Property');
require('dotenv').config({ path: '../.env' });

async function verifyImages() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';
    const maskedUri = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔌 Connecting to:', maskedUri);
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Check Image collection
    const imageCount = await Image.countDocuments();
    console.log(`📊 Total images in Image collection: ${imageCount}`);
    
    if (imageCount > 0) {
      const sampleImage = await Image.findOne();
      console.log('📷 Sample image:', {
        _id: sampleImage._id.toString(),
        filename: sampleImage.filename,
        size: sampleImage.size,
        mimetype: sampleImage.mimetype
      });
    } else {
      console.log('⚠️  No images found in Image collection!');
    }

    // Check Properties
    const properties = await Property.find({});
    console.log(`\n📊 Total properties: ${properties.length}\n`);

    let missingImages = 0;
    let validImages = 0;

    for (const prop of properties) {
      console.log(`\n🏠 Property: ${prop.title}`);
      console.log(`   Images (${prop.images.length}):`);
      
      for (const imgId of prop.images) {
        const image = await Image.findById(imgId);
        if (image) {
          validImages++;
          console.log(`   ✅ ${imgId} - EXISTS (${image.filename}, ${image.size} bytes)`);
        } else {
          missingImages++;
          console.log(`   ❌ ${imgId} - NOT FOUND in Image collection`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Valid images: ${validImages}`);
    console.log(`   ❌ Missing images: ${missingImages}`);
    console.log(`   📷 Total images in DB: ${imageCount}`);

    if (missingImages > 0) {
      console.log('\n⚠️  Some properties reference images that don\'t exist!');
      console.log('   Run scripts/addStockImagesToProperties.js to fix this.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyImages();

