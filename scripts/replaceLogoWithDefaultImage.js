const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Image = require('../server/models/Image');
const Property = require('../server/models/Property');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

async function replaceLogoWithDefaultImage() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    const maskedUri = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔌 Connecting to:', maskedUri);
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected\n');

    // Read the actual default image (-2.jpg), not the logo
    let defaultImagePath = path.join(__dirname, '../assets/ -2.jpg'); // Note: space before dash
    if (!fs.existsSync(defaultImagePath)) {
      defaultImagePath = path.join(__dirname, '../client/public/-2.jpg');
    }
    if (!fs.existsSync(defaultImagePath)) {
      defaultImagePath = path.join(__dirname, '../client/public/ -2.jpg');
    }
    
    if (!fs.existsSync(defaultImagePath)) {
      console.error('❌ Default image file (-2.jpg) not found!');
      process.exit(1);
    }

    const imageBuffer = fs.readFileSync(defaultImagePath);
    const imageStats = fs.statSync(defaultImagePath);
    
    console.log('📁 Default image:', {
      path: defaultImagePath,
      size: imageStats.size
    });

    // Find or create default image (not logo)
    let defaultImage = await Image.findOne({ filename: 'default-property-image.jpg' });
    
    if (!defaultImage) {
      console.log('\n💾 Creating default property image in MongoDB...');
      defaultImage = new Image({
        filename: 'default-property-image.jpg',
        mimetype: 'image/jpeg',
        data: imageBuffer,
        size: imageStats.size
      });
      await defaultImage.save();
      console.log(`✅ Created default image: ${defaultImage._id}`);
    } else {
      console.log(`✅ Using existing default image: ${defaultImage._id}`);
    }

    const defaultImageId = defaultImage._id.toString();

    // Delete the logo stock image if it exists
    const logoImage = await Image.findOne({ filename: 'stock-image.jpg' });
    if (logoImage) {
      console.log(`\n🗑️  Removing logo stock image: ${logoImage._id}`);
      await Image.deleteOne({ _id: logoImage._id });
    }

    // Update all properties to use default image instead of logo
    const properties = await Property.find({});
    console.log(`\n📋 Found ${properties.length} properties\n`);

    let updatedCount = 0;

    for (const property of properties) {
      // Check if property has logo image ID
      const hasLogoImage = property.images.some(imgId => {
        return imgId === logoImage?._id?.toString();
      });

      if (hasLogoImage || property.images.length === 0) {
        property.images = [defaultImageId];
        await property.save();
        console.log(`✅ Updated "${property.title}" with default image`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipping "${property.title}" - already has custom images`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updatedCount} properties`);
    console.log(`   💾 Default image ID: ${defaultImageId}`);
    console.log(`   🗑️  Removed logo stock image`);

    console.log('\n🎉 Done! Properties now use default image instead of logo.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

replaceLogoWithDefaultImage();

