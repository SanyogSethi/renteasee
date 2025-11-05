const express = require('express');
const router = express.Router();
const Image = require('../models/Image');
const fs = require('fs');
const path = require('path');

// Serve image from MongoDB with fallback to default image
router.get('/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      console.log(`⚠️  Image not found in MongoDB: ${req.params.id}`);
      
      // Try to serve default image as fallback
      const defaultImagePath = path.join(__dirname, '../../assets/RENTEASE.jpg');
      const altDefaultPath = path.join(__dirname, '../../assets/-2.jpg');
      
      let fallbackPath = null;
      if (fs.existsSync(defaultImagePath)) {
        fallbackPath = defaultImagePath;
      } else if (fs.existsSync(altDefaultPath)) {
        fallbackPath = altDefaultPath;
      }
      
      if (fallbackPath) {
        console.log(`📷 Serving default image fallback: ${fallbackPath}`);
        res.set({
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000'
        });
        return res.sendFile(path.resolve(fallbackPath));
      }
      
      return res.status(404).json({ 
        message: 'Image not found',
        imageId: req.params.id,
        note: 'This image may have been deleted or migrated. New uploads use MongoDB storage.'
      });
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': image.mimetype,
      'Content-Length': image.size,
      'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
    });
    
    // Send image data
    res.send(image.data);
  } catch (error) {
    console.error('Error serving image:', error);
    
    // Try to serve default image on error
    try {
      const defaultImagePath = path.join(__dirname, '../../assets/RENTEASE.jpg');
      const altDefaultPath = path.join(__dirname, '../../assets/-2.jpg');
      
      let fallbackPath = null;
      if (fs.existsSync(defaultImagePath)) {
        fallbackPath = defaultImagePath;
      } else if (fs.existsSync(altDefaultPath)) {
        fallbackPath = altDefaultPath;
      }
      
      if (fallbackPath) {
        console.log(`📷 Serving default image after error: ${fallbackPath}`);
        res.set({
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000'
        });
        return res.sendFile(path.resolve(fallbackPath));
      }
    } catch (fallbackError) {
      console.error('Error serving fallback image:', fallbackError);
    }
    
    res.status(500).json({ 
      message: 'Error serving image', 
      error: error.message 
    });
  }
});

module.exports = router;

