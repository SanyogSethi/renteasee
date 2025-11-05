const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const { auth, isAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(auth);
router.use(isAdmin);

// Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTenants = await User.countDocuments({ role: 'tenant' });
    const totalOwners = await User.countDocuments({ role: 'owner' });
    const totalProperties = await Property.countDocuments();
    const approvedProperties = await Property.countDocuments({ status: 'approved' });
    const pendingProperties = await Property.countDocuments({ status: 'pending' });
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: 'accepted' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });

    res.json({
      totalUsers,
      totalTenants,
      totalOwners,
      totalProperties,
      approvedProperties,
      pendingProperties,
      totalBookings,
      activeBookings,
      pendingBookings
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Block/Unblock user
router.patch('/users/:id/block', async (req, res) => {
  try {
    const { action } = req.body; // 'block' or 'unblock'
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = action === 'block';
    await user.save();

    res.json({ message: `User ${action}ed successfully`, user });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all properties
router.get('/properties', async (req, res) => {
  try {
    const { status } = req.query; // Filter by status if provided
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const properties = await Property.find(filter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending properties
router.get('/properties/pending', async (req, res) => {
  try {
    const properties = await Property.find({ status: 'pending' })
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (error) {
    console.error('Get pending properties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve property
router.post('/properties/:id/approve', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    property.status = 'approved';
    await property.save();

    // Notify owner about approval
    const Notification = require('../models/Notification');
    const { io } = require('../index');
    
    const ownerNotification = await Notification.create({
      user: property.owner,
      type: 'property_approved',
      title: 'Property Approved',
      message: `Your property "${property.title}" has been approved and is now visible to tenants.`,
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

    // Notify all tenants about new approved property
    const tenants = await User.find({ role: 'tenant', isBlocked: false });
    for (const tenant of tenants) {
      const tenantNotification = await Notification.create({
        user: tenant._id,
        type: 'new_property',
        title: 'New Property Available',
        message: `${property.title} is now available for rent`,
        relatedId: property._id
      });

      if (io) {
        io.to(tenant._id.toString()).emit('new-notification', {
          _id: tenantNotification._id,
          type: tenantNotification.type,
          title: tenantNotification.title,
          message: tenantNotification.message,
          relatedId: tenantNotification.relatedId,
          isRead: tenantNotification.isRead,
          createdAt: tenantNotification.createdAt
        });
      }
    }

    res.json({ message: 'Property approved successfully', property });
  } catch (error) {
    console.error('Approve property error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject property
router.post('/properties/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    property.status = 'rejected';
    if (reason) {
      property.rejectionReason = reason;
    }
    await property.save();

    // Notify owner about rejection
    const Notification = require('../models/Notification');
    const { io } = require('../index');
    
    const notification = await Notification.create({
      user: property.owner,
      type: 'property_rejected',
      title: 'Property Rejected',
      message: reason 
        ? `Your property "${property.title}" has been rejected. Reason: ${reason}`
        : `Your property "${property.title}" has been rejected. Please check the details and resubmit.`,
      relatedId: property._id
    });

    if (io) {
      io.to(property.owner.toString()).emit('new-notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.relatedId,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    }

    res.json({ message: 'Property rejected successfully', property });
  } catch (error) {
    console.error('Reject property error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all ratings
router.get('/ratings', async (req, res) => {
  try {
    const Rating = require('../models/Rating');
    const ratings = await Rating.find()
      .populate('ratedBy', 'name')
      .populate('ratedTo', 'name')
      .populate('booking', 'property')
      .sort({ createdAt: -1 });

    res.json(ratings);
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


