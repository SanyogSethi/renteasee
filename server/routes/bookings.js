const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');
const { isOwner } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { io } = require('../index');

// Get all bookings for current user
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'tenant') {
      query.tenant = req.user._id;
    } else if (req.user.role === 'owner') {
      query.owner = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('tenant', 'name email phone profileImage')
      .populate('owner', 'name email phone profileImage')
      .populate('property', 'title images address')
      .sort({ createdAt: -1 });

    // Categorize bookings
    const now = new Date();
    const categorized = {
      past: bookings.filter(b => new Date(b.endDate) < now && b.status === 'completed'),
      present: bookings.filter(b => {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        return start <= now && end >= now && b.status === 'accepted';
      }),
      future: bookings.filter(b => new Date(b.startDate) > now && b.status === 'accepted'),
      pending: bookings.filter(b => b.status === 'pending'),
      rejected: bookings.filter(b => b.status === 'rejected'),
      cancelled: bookings.filter(b => b.status === 'cancelled')
    };

    res.json(categorized);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get booking calendar data (dates that are booked)
router.get('/calendar', async (req, res) => {
  try {
    const { propertyId } = req.query;
    
    let query = { status: { $in: ['accepted', 'pending'] } };
    if (propertyId) {
      query.property = propertyId;
    } else if (req.user && req.user.role === 'owner') {
      query.owner = req.user._id;
    }

    const bookings = await Booking.find(query)
      .select('startDate endDate property status');

    // Extract booked dates
    const bookedDates = [];
    bookings.forEach(booking => {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      const current = new Date(start);
      
      while (current <= end) {
        bookedDates.push(new Date(current).toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    res.json({ bookedDates, bookings });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept/Reject booking (Owner only)
router.post('/:id/respond', auth, isOwner, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const booking = await Booking.findById(req.params.id)
      .populate('tenant', 'name email')
      .populate('property');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking is not pending' });
    }

    if (action === 'accept') {
      booking.status = 'accepted';
      
      // Reduce available capacity
      const property = await Property.findById(booking.property._id);
      if (property.availableCapacity > 0) {
        property.availableCapacity -= 1;
        await property.save();
      }

      // Notify tenant
      const notification = await Notification.create({
        user: booking.tenant._id,
        type: 'booking_accepted',
        title: 'Booking Accepted',
        message: `Your booking for ${property.title} has been accepted`,
        relatedId: booking._id
      });

      if (io) {
        io.to(booking.tenant._id.toString()).emit('new-notification', {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedId: notification.relatedId,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        });
      }
    } else if (action === 'reject') {
      booking.status = 'rejected';
      
      // Notify tenant
      const notification = await Notification.create({
        user: booking.tenant._id,
        type: 'booking_rejected',
        title: 'Booking Rejected',
        message: `Your booking for ${booking.property.title} has been rejected`,
        relatedId: booking._id
      });

      if (io) {
        io.to(booking.tenant._id.toString()).emit('new-notification', {
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

    await booking.save();
    res.json({ message: `Booking ${action}ed`, booking });
  } catch (error) {
    console.error('Respond booking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete booking (mark as completed after end date)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('property');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isTenant = booking.tenant.toString() === req.user._id.toString();
    const isOwner = booking.owner.toString() === req.user._id.toString();

    if (!isTenant && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const now = new Date();
    if (new Date(booking.endDate) > now) {
      return res.status(400).json({ message: 'Booking period has not ended yet' });
    }

    if (booking.status === 'accepted') {
      booking.status = 'completed';
      
      // Increase available capacity
      const property = await Property.findById(booking.property._id);
      property.availableCapacity += 1;
      await property.save();

      await booking.save();
    }

    res.json({ message: 'Booking marked as completed', booking });
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


