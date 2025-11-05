const mongoose = require('mongoose');
const Image = require('../server/models/Image');
const Property = require('../server/models/Property');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

async function checkProductionImages() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    const maskedUri = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔌 Connecting to:', maskedUri);
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected\n');

    // Check Image collection
    const images = await Image.find({});
    console.log(`📊 Total images in MongoDB: ${images.length}`);
    images.forEach(img => {
      console.log(`  - ${img._id}: ${img.filename} (${img.size} bytes)`);
    });

    // Check Properties
    const properties = await Property.find({});
    console.log(`\n📊 Total properties: ${properties.length}\n`);

    for (const prop of properties) {
      console.log(`\n🏠 ${prop.title}`);
      console.log(`   Images (${prop.images.length}):`);
      
      for (const imgId of prop.images) {
        const image = await Image.findById(imgId);
        if (image) {
          console.log(`   ✅ ${imgId} - EXISTS (${image.filename})`);
        } else {
          console.log(`   ❌ ${imgId} - NOT FOUND`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkProductionImages();

