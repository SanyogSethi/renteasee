const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_chat', 
      'new_property', 
      'booking_request', 
      'booking_accepted', 
      'booking_rejected', 
      'price_proposal', 
      'price_accepted', 
      'price_rejected', 
      'new_message', 
      'system',
      'property_pending',
      'property_submitted',
      'property_approved',
      'property_rejected'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // Can reference Chat, Property, Booking, etc.
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);


