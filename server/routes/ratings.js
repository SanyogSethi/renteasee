const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');

// Submit rating
router.post('/', auth, async (req, res) => {
  try {
    const { bookingId, rating, review } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed bookings' });
    }

    // Check if user is tenant or owner
    const isTenant = booking.tenant.toString() === req.user._id.toString();
    const isOwner = booking.owner.toString() === req.user._id.toString();

    if (!isTenant && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Determine who is being rated
    const ratedTo = isTenant ? booking.owner : booking.tenant;

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      booking: bookingId,
      ratedBy: req.user._id
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review;
      await existingRating.save();
      
      // Update booking
      if (isTenant) {
        booking.ownerRating = rating;
        booking.ownerReview = review;
      } else {
        booking.tenantRating = rating;
        booking.tenantReview = review;
      }
      await booking.save();

      return res.json({ message: 'Rating updated', rating: existingRating });
    }

    // Create new rating
    const newRating = new Rating({
      booking: bookingId,
      ratedBy: req.user._id,
      ratedTo: ratedTo,
      rating,
      review
    });

    await newRating.save();

    // Update booking
    if (isTenant) {
      booking.ownerRating = rating;
      booking.ownerReview = review;
    } else {
      booking.tenantRating = rating;
      booking.tenantReview = review;
    }
    await booking.save();

    res.status(201).json({ message: 'Rating submitted', rating: newRating });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ratings for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const ratings = await Rating.find({ ratedTo: req.params.userId })
      .populate('ratedBy', 'name profileImage')
      .populate('booking', 'property')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.json({ ratings, averageRating: avgRating.toFixed(1), totalRatings: ratings.length });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


