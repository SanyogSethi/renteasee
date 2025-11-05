const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');
const { isOwner } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { io } = require('../index');
const { calculateDistance } = require('../utils/distance');

// Ensure upload directories exist
const propertiesUploadDir = path.join(__dirname, '../../uploads/properties');
if (!fs.existsSync(propertiesUploadDir)) {
  fs.mkdirSync(propertiesUploadDir, { recursive: true });
  console.log(`✅ Created directory: ${propertiesUploadDir}`);
}

// Configure multer for property images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path to ensure file is saved correctly on Render
    cb(null, propertiesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Ensure extension is lowercase for consistency
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'prop-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all properties (Homepage) with search and filters
router.get('/', async (req, res) => {
  try {
    const {
      search,
      foodAvailability,
      wifi,
      ac,
      laundry,
      housekeeping,
      attachedBathroom,
      parking,
      minPrice,
      maxPrice,
      city,
      workplaceLat,
      workplaceLon,
      maxDistance // in kilometers
    } = req.query;

    // Build filter object - only show approved properties
    // Handle properties without status (old properties) as approved for backward compatibility
    const filter = { 
      isAvailable: true
    };

    // Build status filter - approved or no status (old properties)
    const statusFilter = {
      $or: [
        { status: 'approved' },
        { status: { $exists: false } } // Old properties without status field
      ]
    };

    // Start with $and array to combine all filters properly
    filter.$and = [statusFilter];

    // Search filter (title, description, or address)
    if (search) {
      const searchFilter = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'address.fullAddress': { $regex: search, $options: 'i' } },
          { 'address.city': { $regex: search, $options: 'i' } }
        ]
      };
      filter.$and.push(searchFilter);
    }

    // City filter (works independently or with search)
    if (city) {
      filter.$and.push({
        $or: [
          { 'address.city': { $regex: city, $options: 'i' } },
          { 'address.fullAddress': { $regex: city, $options: 'i' } }
        ]
      });
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Amenities filters
    if (foodAvailability) {
      filter['amenitiesDetails.foodAvailability'] = foodAvailability;
    }
    if (wifi) {
      filter['amenitiesDetails.wifi'] = wifi;
    }
    if (ac) {
      filter['amenitiesDetails.ac'] = ac;
    }
    if (laundry) {
      filter['amenitiesDetails.laundry'] = laundry;
    }
    if (housekeeping) {
      filter['amenitiesDetails.housekeeping'] = housekeeping;
    }
    if (attachedBathroom) {
      filter['amenitiesDetails.attachedBathroom'] = attachedBathroom;
    }
    if (parking) {
      filter['amenitiesDetails.parking'] = parking;
    }

    let properties = await Property.find(filter)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });
    
    // Filter by distance if workplace location is provided
    if (workplaceLat && workplaceLon && maxDistance) {
      const lat = parseFloat(workplaceLat);
      const lon = parseFloat(workplaceLon);
      const maxDist = parseFloat(maxDistance);
      
      properties = properties.filter(property => {
        if (!property.location || !property.location.latitude || !property.location.longitude) {
          return false; // Skip properties without location data
        }
        const distance = calculateDistance(
          lat,
          lon,
          property.location.latitude,
          property.location.longitude
        );
        property.distanceFromWorkplace = distance; // Add distance to property object
        return distance <= maxDist;
      });
      
      // Sort by distance if filtering by distance
      properties.sort((a, b) => (a.distanceFromWorkplace || Infinity) - (b.distanceFromWorkplace || Infinity));
    }
    
    res.json(properties);
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone');
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create property (Owner only)
router.post('/', auth, isOwner, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, address, price, capacity, amenities, rules, latitude, longitude,
            foodAvailability, wifi, ac, laundry, housekeeping, attachedBathroom, parking } = req.body;

    if (!title || !description || !price || !capacity) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    let addressObj = {};
    if (typeof address === 'string') {
      addressObj.fullAddress = address;
    } else {
      addressObj = address;
    }

    const images = req.files ? req.files.map(file => file.path) : [];

    // Build amenitiesDetails object
    const amenitiesDetails = {
      foodAvailability: foodAvailability || 'Without food',
      wifi: wifi || 'No',
      ac: ac || 'Non-AC',
      laundry: laundry || 'Not available',
      housekeeping: housekeeping || 'None',
      attachedBathroom: attachedBathroom || 'No',
      parking: parking || 'None'
    };

    const property = new Property({
      owner: req.user._id,
      title,
      description,
      address: addressObj,
      location: (latitude && longitude) ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      } : undefined,
      price,
      capacity,
      availableCapacity: capacity,
      amenities: amenities ? (Array.isArray(amenities) ? amenities : JSON.parse(amenities)) : [],
      rules: rules ? (Array.isArray(rules) ? rules : JSON.parse(rules)) : [],
      images,
      amenitiesDetails,
      status: 'pending' // New properties require admin approval
    });

    console.log('Creating property with status:', property.status);

    await property.save();

    console.log('Property saved with status:', property.status);

    // Notify admin about new property pending approval
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin', isBlocked: false });
    
    for (const admin of admins) {
      const notification = await Notification.create({
        user: admin._id,
        type: 'property_pending',
        title: 'New Property Pending Approval',
        message: `${property.title} is waiting for your approval`,
        relatedId: property._id
      });

      // Send real-time notification
      if (io) {
        io.to(admin._id.toString()).emit('new-notification', {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedId: notification.relatedId,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        });
      }
    }

    // Notify owner that property is pending approval
    const ownerNotification = await Notification.create({
      user: req.user._id,
      type: 'property_submitted',
      title: 'Property Submitted',
      message: `Your property "${property.title}" has been submitted for approval. You'll be notified once it's reviewed.`,
      relatedId: property._id
    });

    if (io) {
      io.to(req.user._id.toString()).emit('new-notification', {
        _id: ownerNotification._id,
        type: ownerNotification.type,
        title: ownerNotification.title,
        message: ownerNotification.message,
        relatedId: ownerNotification.relatedId,
        isRead: ownerNotification.isRead,
        createdAt: ownerNotification.createdAt
      });
    }

    res.status(201).json(property);
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update property (Owner only)
router.put('/:id', auth, isOwner, upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    const { title, description, address, price, capacity, amenities, rules, isAvailable, latitude, longitude,
            foodAvailability, wifi, ac, laundry, housekeeping, attachedBathroom, parking } = req.body;

    // Track if any significant changes were made (excluding isAvailable)
    // For old properties without status, treat as 'approved' since they were visible on homepage
    const originalStatus = property.status || 'approved';
    let hasSignificantChanges = false;
    
    console.log(`\n=== Updating Property ${property._id} ===`);
    console.log(`Property status from DB: ${property.status}`);
    console.log(`Original status (processed): ${originalStatus}`);
    console.log(`Current property title: "${property.title}"`);
    console.log(`Received title: "${title}"`);
    console.log(`Received price: ${price}, Current price: ${property.price}`);

    // Check title change (always check if provided, even if empty)
    if (title !== undefined && title !== property.title) {
      const oldTitle = property.title;
      property.title = title;
      hasSignificantChanges = true;
      console.log(`✓ Title changed: "${oldTitle}" -> "${title}"`);
    }
    // Check description change
    if (description !== undefined && description !== property.description) {
      property.description = description;
      hasSignificantChanges = true;
      console.log(`✓ Description changed`);
    }
    if (address !== undefined) {
      const newAddress = typeof address === 'string' ? { fullAddress: address } : address;
      const currentAddressStr = JSON.stringify(property.address || {});
      const newAddressStr = JSON.stringify(newAddress);
      if (currentAddressStr !== newAddressStr) {
        property.address = newAddress;
        hasSignificantChanges = true;
        console.log(`✓ Address changed`);
      }
    }
    if (latitude !== undefined && longitude !== undefined) {
      const newLat = parseFloat(latitude);
      const newLng = parseFloat(longitude);
      const currentLat = property.location?.latitude;
      const currentLng = property.location?.longitude;
      if (!property.location || 
          Math.abs(currentLat - newLat) > 0.0001 || 
          Math.abs(currentLng - newLng) > 0.0001) {
        property.location = {
          latitude: newLat,
          longitude: newLng
        };
        hasSignificantChanges = true;
        console.log(`✓ Location changed: (${currentLat}, ${currentLng}) -> (${newLat}, ${newLng})`);
      }
    }
    if (price !== undefined) {
      const newPrice = parseFloat(price);
      if (Math.abs(newPrice - property.price) > 0.01) {
        const oldPrice = property.price;
        property.price = newPrice;
        hasSignificantChanges = true;
        console.log(`✓ Price changed: ${oldPrice} -> ${newPrice}`);
      }
    }
    if (capacity !== undefined) {
      const newCapacity = parseInt(capacity);
      if (newCapacity !== property.capacity) {
        property.capacity = newCapacity;
        if (property.availableCapacity > newCapacity) {
          property.availableCapacity = newCapacity;
        }
        hasSignificantChanges = true;
        console.log(`✓ Capacity changed: ${property.capacity} -> ${newCapacity}`);
      }
    }
    if (amenities !== undefined) {
      try {
        let newAmenities;
        if (Array.isArray(amenities)) {
          newAmenities = amenities;
        } else if (typeof amenities === 'string') {
          try {
            newAmenities = JSON.parse(amenities);
          } catch (e) {
            // If JSON parse fails, try treating as comma-separated string
            newAmenities = amenities.split(',').map(a => a.trim()).filter(a => a.length > 0);
          }
        } else {
          newAmenities = [];
        }
        
        const currentAmenities = (property.amenities || []).sort();
        const newAmenitiesSorted = Array.isArray(newAmenities) ? newAmenities.sort() : [];
        if (JSON.stringify(currentAmenities) !== JSON.stringify(newAmenitiesSorted)) {
          property.amenities = newAmenities;
          hasSignificantChanges = true;
          console.log(`✓ Amenities changed`);
        }
      } catch (error) {
        console.error('Error parsing amenities:', error);
        // Don't update amenities if parsing fails
      }
    }
    if (rules !== undefined) {
      try {
        let newRules;
        if (Array.isArray(rules)) {
          newRules = rules;
        } else if (typeof rules === 'string') {
          try {
            newRules = JSON.parse(rules);
          } catch (e) {
            // If JSON parse fails, try treating as comma-separated string
            newRules = rules.split(',').map(r => r.trim()).filter(r => r.length > 0);
          }
        } else {
          newRules = [];
        }
        
        const currentRules = (property.rules || []).sort();
        const newRulesSorted = Array.isArray(newRules) ? newRules.sort() : [];
        if (JSON.stringify(currentRules) !== JSON.stringify(newRulesSorted)) {
          property.rules = newRules;
          hasSignificantChanges = true;
          console.log(`✓ Rules changed`);
        }
      } catch (error) {
        console.error('Error parsing rules:', error);
        // Don't update rules if parsing fails
      }
    }
    
    // Check amenitiesDetails changes - always update if provided
    if (foodAvailability !== undefined) {
      if (!property.amenitiesDetails) property.amenitiesDetails = {};
      if (property.amenitiesDetails.foodAvailability !== foodAvailability) {
        property.amenitiesDetails.foodAvailability = foodAvailability;
        hasSignificantChanges = true;
        console.log(`✓ Food Availability changed: ${property.amenitiesDetails.foodAvailability} -> ${foodAvailability}`);
      }
    }
    if (wifi !== undefined) {
      if (!property.amenitiesDetails) property.amenitiesDetails = {};
      if (property.amenitiesDetails.wifi !== wifi) {
        property.amenitiesDetails.wifi = wifi;
        hasSignificantChanges = true;
        console.log(`✓ WiFi changed: ${property.amenitiesDetails.wifi} -> ${wifi}`);
      }
    }
    if (ac !== undefined) {
      if (!property.amenitiesDetails) property.amenitiesDetails = {};
      if (property.amenitiesDetails.ac !== ac) {
        property.amenitiesDetails.ac = ac;
        hasSignificantChanges = true;
        console.log(`✓ AC changed: ${property.amenitiesDetails.ac} -> ${ac}`);
      }
    }
    if (laundry !== undefined) {
      if (!property.amenitiesDetails) property.amenitiesDetails = {};
      if (property.amenitiesDetails.laundry !== laundry) {
        property.amenitiesDetails.laundry = laundry;
        hasSignificantChanges = true;
        console.log(`✓ Laundry changed: ${property.amenitiesDetails.laundry} -> ${laundry}`);
      }
    }
    if (housekeeping !== undefined) {
      if (!property.amenitiesDetails) property.amenitiesDetails = {};
      if (property.amenitiesDetails.housekeeping !== housekeeping) {
        property.amenitiesDetails.housekeeping = housekeeping;
        hasSignificantChanges = true;
        console.log(`✓ Housekeeping changed: ${property.amenitiesDetails.housekeeping} -> ${housekeeping}`);
      }
    }
    if (attachedBathroom !== undefined) {
      if (!property.amenitiesDetails) property.amenitiesDetails = {};
      if (property.amenitiesDetails.attachedBathroom !== attachedBathroom) {
        property.amenitiesDetails.attachedBathroom = attachedBathroom;
        hasSignificantChanges = true;
        console.log(`✓ Attached Bathroom changed: ${property.amenitiesDetails.attachedBathroom} -> ${attachedBathroom}`);
      }
    }
    if (parking !== undefined) {
      if (!property.amenitiesDetails) property.amenitiesDetails = {};
      if (property.amenitiesDetails.parking !== parking) {
        property.amenitiesDetails.parking = parking;
        hasSignificantChanges = true;
        console.log(`✓ Parking changed: ${property.amenitiesDetails.parking} -> ${parking}`);
      }
    }
    
    // Ensure amenitiesDetails is initialized even if no changes were made
    if (!property.amenitiesDetails) {
      property.amenitiesDetails = {
        foodAvailability: foodAvailability || 'Without food',
        wifi: wifi || 'No',
        ac: ac || 'Non-AC',
        laundry: laundry || 'Not available',
        housekeeping: housekeeping || 'None',
        attachedBathroom: attachedBathroom || 'No',
        parking: parking || 'None'
      };
    }
    
    if (typeof isAvailable !== 'undefined') {
      property.isAvailable = isAvailable;
      // isAvailable changes don't require re-approval
    }

    // Check if new images were added
    if (req.files && req.files.length > 0) {
      // Verify files were actually saved
      const newImagePaths = req.files.map(file => {
        const filePath = file.path;
        // Verify file exists
        if (!fs.existsSync(filePath)) {
          console.error(`⚠️  Warning: Uploaded file not found at: ${filePath}`);
          // Still return the path - it might be accessible via static serving
        }
        return filePath;
      });
      
      property.images = [...(property.images || []), ...newImagePaths];
      hasSignificantChanges = true;
      console.log(`✓ Added ${newImagePaths.length} new image(s)`);
    }

    // ALWAYS set status to pending for approved properties when they're updated
    // This ensures admin approval is required for any changes
    console.log(`hasSignificantChanges: ${hasSignificantChanges}, originalStatus: ${originalStatus}`);
    
    // If property is approved (or has no status/old property), ALWAYS set to pending on update
    // Only skip if property is already pending
    // Check both originalStatus and property.status to catch all cases
    const isApproved = originalStatus === 'approved' || !property.status || property.status === 'approved';
    
    if (isApproved && property.status !== 'pending') {
      // Force pending status for any update to approved property
      console.log(`\n>>> Property ${property._id} ("${property.title}") is being updated. Setting status from "${originalStatus}" to "pending" (admin approval required).`);
      property.status = 'pending';
      property.rejectionReason = null;
      
      // Notify admin about property update requiring approval
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin', isBlocked: false });
      
      for (const admin of admins) {
        const notification = await Notification.create({
          user: admin._id,
          type: 'property_pending',
          title: 'Property Updated - Requires Approval',
          message: `${property.title} has been updated and requires approval`,
          relatedId: property._id
        });

        if (io) {
          io.to(admin._id.toString()).emit('new-notification', {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            relatedId: notification.relatedId,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });
        }
      }

      // Notify owner that property is pending approval
      const ownerNotification = await Notification.create({
        user: property.owner,
        type: 'property_submitted',
        title: 'Property Update Submitted',
        message: `Your property "${property.title}" has been updated and is pending admin approval.`,
        relatedId: property._id
      });

      if (io) {
        io.to(property.owner.toString()).emit('new-notification', {
          _id: ownerNotification._id,
          type: ownerNotification.type,
          title: ownerNotification.title,
          message: ownerNotification.message,
          relatedId: ownerNotification.relatedId,
          isRead: ownerNotification.isRead,
          createdAt: ownerNotification.createdAt
        });
      }
    } else if (hasSignificantChanges && originalStatus !== 'pending') {
      // For rejected properties, only set to pending if there are actual changes
      console.log(`\n>>> Property ${property._id} ("${property.title}") has significant changes. Setting status from "${originalStatus}" to "pending".`);
      property.status = 'pending';
      property.rejectionReason = null;
      
      // Notify admin about property update requiring approval
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin', isBlocked: false });
      
      for (const admin of admins) {
        const notification = await Notification.create({
          user: admin._id,
          type: 'property_pending',
          title: originalStatus === 'rejected' ? 'Property Resubmitted' : 'Property Updated',
          message: `${property.title} has been updated and requires approval`,
          relatedId: property._id
        });

        if (io) {
          io.to(admin._id.toString()).emit('new-notification', {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            relatedId: notification.relatedId,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });
        }
      }

      // Notify owner that property is pending approval
      const ownerNotification = await Notification.create({
        user: property.owner,
        type: 'property_submitted',
        title: 'Property Update Submitted',
        message: `Your property "${property.title}" has been updated and is pending admin approval.`,
        relatedId: property._id
      });

      if (io) {
        io.to(property.owner.toString()).emit('new-notification', {
          _id: ownerNotification._id,
          type: ownerNotification.type,
          title: ownerNotification.title,
          message: ownerNotification.message,
          relatedId: ownerNotification.relatedId,
          isRead: ownerNotification.isRead,
          createdAt: ownerNotification.createdAt
        });
      }
    }

    // Ensure required fields are present before saving
    if (!property.title || !property.description || !property.price || !property.capacity) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        error: 'Title, description, price, and capacity are required'
      });
    }

    // Ensure availableCapacity is valid
    if (property.availableCapacity === undefined || property.availableCapacity === null) {
      property.availableCapacity = property.capacity;
    }
    if (property.availableCapacity > property.capacity) {
      property.availableCapacity = property.capacity;
    }

    await property.save();
    
    // Log final status for debugging
    console.log(`\n=== Property ${property._id} saved with status: ${property.status} ===\n`);
    
    res.json(property);
  } catch (error) {
    console.error('Update property error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error message
    let errorMessage = 'Server error';
    if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ message: 'Server error', error: errorMessage });
  }
});

// Get owner's properties (including pending/rejected)
router.get('/owner/my-properties', auth, isOwner, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id })
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    console.error('Get owner properties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete property (Owner only)
router.delete('/:id', auth, isOwner, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

