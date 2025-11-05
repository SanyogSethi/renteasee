const mongoose = require('mongoose')
const Property = require('../server/models/Property')
const User = require('../server/models/User')
const Chat = require('../server/models/Chat')
require('dotenv').config({ path: '../.env' })

async function fixImagePaths() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rentease'
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')

    // Fix Property images
    const properties = await Property.find({})
    let fixedProperties = 0
    
    for (const property of properties) {
      if (property.images && property.images.length > 0) {
        const fixedImages = property.images.map(img => {
          if (!img) return img
          
          // If it's already a relative path starting with uploads/, keep it
          if (typeof img === 'string' && img.startsWith('uploads/')) {
            return img
          }
          
          // If it's an absolute path, extract the relative path
          if (typeof img === 'string' && img.includes('uploads/')) {
            const match = img.match(/(uploads\/.+)$/)
            if (match) {
              const relativePath = match[1].replace(/\\/g, '/')
              console.log(`✓ Fixed property image: ${img} -> ${relativePath}`)
              return relativePath
            }
          }
          
          return img
        })
        
        // Check if any images were changed
        const changed = fixedImages.some((img, idx) => img !== property.images[idx])
        if (changed) {
          property.images = fixedImages
          await property.save()
          fixedProperties++
          console.log(`✅ Fixed property: ${property.title} (${property._id})`)
        }
      }
    }
    
    console.log(`\n✅ Fixed ${fixedProperties} properties`)

    // Fix User verification documents
    const users = await User.find({ verificationDocument: { $exists: true, $ne: null } })
    let fixedUsers = 0
    
    for (const user of users) {
      if (user.verificationDocument && typeof user.verificationDocument === 'string') {
        // If it's already a relative path, keep it
        if (user.verificationDocument.startsWith('uploads/')) {
          continue
        }
        
        // If it's an absolute path, extract the relative path
        if (user.verificationDocument.includes('uploads/')) {
          const match = user.verificationDocument.match(/(uploads\/.+)$/)
          if (match) {
            const relativePath = match[1].replace(/\\/g, '/')
            user.verificationDocument = relativePath
            await user.save()
            fixedUsers++
            console.log(`✅ Fixed user document: ${user.name} (${user._id})`)
          }
        }
      }
    }
    
    console.log(`✅ Fixed ${fixedUsers} users`)

    // Fix Chat message images
    const chats = await Chat.find({ 'messages.imageUrl': { $exists: true } })
    let fixedChats = 0
    
    for (const chat of chats) {
      let changed = false
      chat.messages.forEach(msg => {
        if (msg.imageUrl && typeof msg.imageUrl === 'string') {
          // If it's already a relative path, keep it
          if (msg.imageUrl.startsWith('uploads/')) {
            return
          }
          
          // If it's an absolute path, extract the relative path
          if (msg.imageUrl.includes('uploads/')) {
            const match = msg.imageUrl.match(/(uploads\/.+)$/)
            if (match) {
              msg.imageUrl = match[1].replace(/\\/g, '/')
              changed = true
            }
          }
        }
      })
      
      if (changed) {
        await chat.save()
        fixedChats++
        console.log(`✅ Fixed chat: ${chat._id}`)
      }
    }
    
    console.log(`✅ Fixed ${fixedChats} chats`)

    console.log('\n🎉 Image path fix completed!')
    console.log(`Properties: ${fixedProperties}`)
    console.log(`Users: ${fixedUsers}`)
    console.log(`Chats: ${fixedChats}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error fixing image paths:', error)
    process.exit(1)
  }
}

fixImagePaths()

