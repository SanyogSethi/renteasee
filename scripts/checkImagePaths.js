const mongoose = require('mongoose')
const Property = require('../server/models/Property')
require('dotenv').config({ path: '../.env' })

async function checkImagePaths() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease'
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB\n')

    const properties = await Property.find({ images: { $exists: true, $ne: [] } })
    
    console.log(`Found ${properties.length} properties with images:\n`)
    
    properties.forEach(prop => {
      console.log(`Property: ${prop.title} (${prop._id})`)
      console.log(`Status: ${prop.status || 'no status'}`)
      console.log(`Images (${prop.images.length}):`)
      prop.images.forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img}`)
      })
      console.log('')
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkImagePaths()

