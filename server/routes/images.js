const express = require('express');
const router = express.Router();
const Image = require('../models/Image');
const fs = require('fs');
const path = require('path');

// Serve image from MongoDB - only fallback if image truly doesn't exist
router.get('/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      console.log(`⚠️  Image not found in MongoDB: ${req.params.id}`);
      
      // Return 404 instead of falling back to stock image
      // This allows frontend to handle missing images properly
      return res.status(404).json({ 
        message: 'Image not found',
        imageId: req.params.id,
        note: 'This image may have been deleted. Please upload a new image.'
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
    
    // Return error instead of falling back
    res.status(500).json({ 
      message: 'Error serving image', 
      error: error.message 
    });
  }
});

module.exports = router;

